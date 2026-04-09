import { dbConnect } from "@/service/mongo";
import { Quiz } from "@/model/quizv2-model";
import { Attempt } from "@/model/attemptv2-model";
import { Question } from "@/model/questionv2-model";
import { startBatAttempt, submitBatBlock, getBatResult } from "@/app/actions/bat-quiz";
import mongoose from "mongoose";

// Mock the dependencies
const studentId = new mongoose.Types.ObjectId().toString();
jest.mock("@/lib/loggedin-user", () => ({
  getLoggedInUser: jest.fn(() => Promise.resolve({ id: studentId }))
}));

describe("bat-quiz integration US4", () => {
  let quizId;

  beforeAll(async () => {
    await dbConnect();
    
    // Create a mock quiz with BAT enabled
    const quiz = await Quiz.create({
      courseId: new mongoose.Types.ObjectId(),
      title: "BAT US4 Integration Test Quiz " + Date.now(),
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

    // Create 15 questions with concept tags
    const questions = [];
    for (let i = 0; i < 5; i++) {
      questions.push({ 
        quizId: quiz._id, 
        type: "single", 
        text: `Easy ${i}`, 
        irt: { a: 1, b: -1.5, c: 0 }, 
        correctOptionIds: ["1"], 
        options: [{ id: "1", text: "A" }, { id: "2", text: "B" }], 
        order: i,
        conceptTags: ["Concept A", "Concept B"]
      });
      questions.push({ 
        quizId: quiz._id, 
        type: "single", 
        text: `Medium ${i}`, 
        irt: { a: 1, b: 0, c: 0 }, 
        correctOptionIds: ["1"], 
        options: [{ id: "1", text: "A" }, { id: "2", text: "B" }], 
        order: i + 5,
        conceptTags: ["Concept B", "Concept C"]
      });
      questions.push({ 
        quizId: quiz._id, 
        type: "single", 
        text: `Hard ${i}`, 
        irt: { a: 1, b: 1.5, c: 0 }, 
        correctOptionIds: ["1"], 
        options: [{ id: "1", text: "A" }, { id: "2", text: "B" }], 
        order: i + 10,
        conceptTags: ["Concept C", "Concept D"]
      });
    }
    await Question.insertMany(questions);
  });

  afterAll(async () => {
    await Quiz.deleteMany({ _id: quizId });
    await Question.deleteMany({ quizId });
    await Attempt.deleteMany({ quizId });
    await mongoose.connection.close();
  });

  it("should record missed concept tags on completion (T045)", async () => {
    const sessionId = "session-us4-test";
    let result = await startBatAttempt(quizId, sessionId);
    const attemptId = result.data.attemptId;

    // Submit 5 blocks, making mistakes to trigger missed concept tags
    for (let i = 0; i < 5; i++) {
      const currentBlock = result.data.currentBlock || result.data.nextBlock;
      const answers = currentBlock.questions.map((q, idx) => ({
        questionId: q.id,
        selectedOptionIds: idx === 0 ? ["1"] : ["2"] // First correct, second incorrect
      }));
      
      result = await submitBatBlock(attemptId, answers, sessionId);
    }

    expect(result.data.status).toBe("completed");
    expect(result.data.summary.missedConceptTags).toBeDefined();
    expect(result.data.summary.missedConceptTags.length).toBeGreaterThan(0);

    // Verify in DB
    const attempt = await Attempt.findById(attemptId);
    expect(attempt.bat.missedConceptTags).toBeDefined();
    expect(attempt.bat.missedConceptTags.length).toBeGreaterThan(0);
    
    // Check if the tags are from the incorrect questions
    // Since we made the second question in each block incorrect, and blocks were medium/easy/hard
    // they should contain tags from those questions.
  });

  it("should include missed concept tags in getBatResult (T049)", async () => {
    const sessionId = "session-us4-result-test";
    let result = await startBatAttempt(quizId, sessionId);
    const attemptId = result.data.attemptId;

    for (let i = 0; i < 5; i++) {
      const currentBlock = result.data.currentBlock || result.data.nextBlock;
      const answers = currentBlock.questions.map((q, idx) => ({
        questionId: q.id,
        selectedOptionIds: ["2"] // All incorrect
      }));
      result = await submitBatBlock(attemptId, answers, sessionId);
    }

    const resultData = await getBatResult(attemptId);
    expect(resultData.success).toBe(true);
    expect(resultData.data.missedConceptTags).toBeDefined();
    expect(resultData.data.missedConceptTags.length).toBeGreaterThan(0);
  });
});
