import { dbConnect } from "@/service/mongo";
import { Quiz } from "@/model/quizv2-model";
import { Attempt } from "@/model/attemptv2-model";
import { Question } from "@/model/questionv2-model";
import { startBatAttempt, submitBatBlock } from "@/app/actions/bat-quiz";
import mongoose from "mongoose";

// Mock the dependencies
const studentId = new mongoose.Types.ObjectId().toString();
jest.mock("@/lib/loggedin-user", () => ({
  getLoggedInUser: jest.fn(() => Promise.resolve({ id: studentId }))
}));

describe("bat-quiz integration", () => {
  let quizId;

  beforeAll(async () => {
    await dbConnect();
    
    // Create a mock quiz with BAT enabled
    const quiz = await Quiz.create({
      courseId: new mongoose.Types.ObjectId(),
      title: "BAT Integration Test Quiz " + Date.now(),
      published: true,
      passPercent: 70,
      createdBy: new mongoose.Types.ObjectId(),
      batConfig: {
        enabled: true,
        blockSize: 2,
        totalBlocks: 5,
        initialTheta: 0.0
      }
    });
    quizId = quiz._id.toString();

    // Create 15 questions (5 easy, 5 medium, 5 hard)
    const questions = [];
    for (let i = 0; i < 5; i++) {
      questions.push({ quizId: quiz._id, type: "single", text: `Easy ${i}`, irt: { a: 1, b: -1.5, c: 0 }, correctOptionIds: ["1"], options: [{ id: "1", text: "A" }, { id: "2", text: "B" }], order: i });
      questions.push({ quizId: quiz._id, type: "single", text: `Medium ${i}`, irt: { a: 1, b: 0, c: 0 }, correctOptionIds: ["1"], options: [{ id: "1", text: "A" }, { id: "2", text: "B" }], order: i + 5 });
      questions.push({ quizId: quiz._id, type: "single", text: `Hard ${i}`, irt: { a: 1, b: 1.5, c: 0 }, correctOptionIds: ["1"], options: [{ id: "1", text: "A" }, { id: "2", text: "B" }], order: i + 10 });
    }
    await Question.insertMany(questions);
  });

  afterAll(async () => {
    await Quiz.deleteMany({ _id: quizId });
    await Question.deleteMany({ quizId });
    await Attempt.deleteMany({ quizId });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear any existing attempts for this student/quiz before each test
    await Attempt.deleteMany({ quizId, studentId });
  });

  describe("startBatAttempt", () => {
    it("should return exactly 2 questions for the first block", async () => {
      const result = await startBatAttempt(quizId, "session1");
      expect(result.success).toBe(true);
      expect(result.data.currentBlock.questions.length).toBe(2);
      expect(result.data.blockNumber).toBe(1);
    });

    it("should return questions from the medium band for initial theta 0", async () => {
      const result = await startBatAttempt(quizId, "session2");
      const questions = result.data.currentBlock.questions;
      // Medium questions have b=0
      expect(questions[0].irt.b).toBe(0);
      expect(questions[1].irt.b).toBe(0);
      expect(result.data.currentBlock.difficultyBand).toBe("medium");
    });
  });

  describe("submitBatBlock", () => {
    it("should update theta only after block submission", async () => {
      const startResult = await startBatAttempt(quizId, "session-theta-test");
      const attemptId = startResult.data.attemptId;
      const initialTheta = startResult.data.theta;

      const answers = startResult.data.currentBlock.questions.map(q => ({
        questionId: q.id,
        selectedOptionIds: ["1"] // Correct answer
      }));

      const submitResult = await submitBatBlock(attemptId, answers, "session-theta-test");
      
      expect(submitResult.success).toBe(true);
      expect(submitResult.data.status).toBe("continuing");
      expect(submitResult.data.newTheta).not.toBe(initialTheta);
      
      // Verify theta history in DB
      const attempt = await Attempt.findById(attemptId);
      expect(attempt.bat.thetaHistory.length).toBe(1);
      expect(attempt.bat.thetaHistory[0].theta).toBe(submitResult.data.newTheta);
    });

    it("should select next block difficulty based on updated theta", async () => {
      const startResult = await startBatAttempt(quizId, "session-adaptive-test");
      const attemptId = startResult.data.attemptId;

      // Force incorrect answers to lower theta
      const answers = startResult.data.currentBlock.questions.map(q => ({
        questionId: q.id,
        selectedOptionIds: ["2"] // Incorrect answer
      }));

      const submitResult = await submitBatBlock(attemptId, answers, "session-adaptive-test");
      
      expect(submitResult.success).toBe(true);
      expect(submitResult.data.newTheta).toBeLessThan(0);
      
      // If theta drops below -1, next band should be 'easy'
      if (submitResult.data.newTheta < -1) {
        expect(submitResult.data.nextBlock.difficultyBand).toBe("easy");
        expect(submitResult.data.nextBlock.questions[0].irt.b).toBe(-1.5);
      } else {
        // Still medium but lower theta
        expect(["medium", "easy"]).toContain(submitResult.data.nextBlock.difficultyBand);
      }
    });
  });

  describe("Fixed-Length Termination (US3)", () => {
    // ... existing tests ...
  });

  describe("BAT Configuration & Validation (US5)", () => {
    it("should return false when pool has <4 questions per band", async () => {
      // Create a quiz with insufficient questions
      const badQuiz = await Quiz.create({
        courseId: new mongoose.Types.ObjectId(),
        title: "Bad Pool Quiz",
        published: true,
        createdBy: new mongoose.Types.ObjectId(),
        batConfig: { enabled: true }
      });

      // Add only 2 easy questions
      await Question.create([
        { quizId: badQuiz._id, type: "single", text: "E1", irt: { a: 1, b: -2, c: 0 }, correctOptionIds: ["1"], options: [{ id: "1", text: "A" }, { id: "2", text: "B" }] },
        { quizId: badQuiz._id, type: "single", text: "E2", irt: { a: 1, b: -2, c: 0 }, correctOptionIds: ["1"], options: [{ id: "1", text: "A" }, { id: "2", text: "B" }] }
      ]);

      const { validateBatPool } = require("@/app/actions/bat-quiz");
      const validation = await validateBatPool(badQuiz._id.toString());
      
      expect(validation.valid).toBe(false);
      expect(validation.counts.easy).toBe(2);
      expect(validation.counts.medium).toBe(0);
      expect(validation.counts.hard).toBe(0);

      await Quiz.deleteOne({ _id: badQuiz._id });
      await Question.deleteMany({ quizId: badQuiz._id });
    });

    it("should return true when pool has 4+ questions per band", async () => {
      const { validateBatPool } = require("@/app/actions/bat-quiz");
      const validation = await validateBatPool(quizId); // quizId from beforeAll has 5 per band
      
      expect(validation.valid).toBe(true);
      expect(validation.counts.easy).toBe(5);
      expect(validation.counts.medium).toBe(5);
      expect(validation.counts.hard).toBe(5);
    });

    it("should persist batConfig.enabled when updated", async () => {
      const quiz = await Quiz.findById(quizId);
      quiz.batConfig.enabled = false;
      await quiz.save();

      const updatedQuiz = await Quiz.findById(quizId);
      expect(updatedQuiz.batConfig.enabled).toBe(false);

      updatedQuiz.batConfig.enabled = true;
      await updatedQuiz.save();
      
      const reUpdatedQuiz = await Quiz.findById(quizId);
      expect(reUpdatedQuiz.batConfig.enabled).toBe(true);
    });
  });
});
