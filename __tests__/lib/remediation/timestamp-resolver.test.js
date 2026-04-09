import mongoose from "mongoose";
import { resolveTimestampForConcept } from "@/lib/remediation/timestamp-resolver";

jest.mock("@/service/chroma", () => ({
  queryEmbeddings: jest.fn(),
}));

jest.mock("@/lib/embeddings/gemini", () => ({
  generateEmbedding: jest.fn(),
}));

jest.mock("@/model/video-transcript.model", () => ({
  VideoTranscript: {
    findOne: jest.fn(),
  },
}));

describe("resolveTimestampForConcept", () => {
  const courseId = new mongoose.Types.ObjectId().toString();
  const lessonId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    const { generateEmbedding } = require("@/lib/embeddings/gemini");
    const { queryEmbeddings } = require("@/service/chroma");
    const { VideoTranscript } = require("@/model/video-transcript.model");

    generateEmbedding.mockResolvedValue(new Array(8).fill(0.1));
    queryEmbeddings.mockResolvedValue([
      {
        id: "chunk-1",
        score: 0.2,
        document: "Trees and graphs",
        metadata: {
          lessonId,
          courseId,
          chunkIndex: 0,
          startTimestamp: 42,
          endTimestamp: 120,
          videoId: "vid-1",
        },
      },
    ]);
    VideoTranscript.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
  });

  it("returns segment from Chroma metadata when timestamps are present", async () => {
    const result = await resolveTimestampForConcept(courseId, "Binary Trees");
    expect(result).toEqual({
      lessonId,
      videoId: "vid-1",
      startTimestamp: 42,
      endTimestamp: 120,
    });
  });

  it("returns null when embedding fails", async () => {
    const { generateEmbedding } = require("@/lib/embeddings/gemini");
    generateEmbedding.mockRejectedValueOnce(new Error("api"));
    const result = await resolveTimestampForConcept(courseId, "X");
    expect(result).toBeNull();
  });

  it("returns null when Chroma returns no hits", async () => {
    const { queryEmbeddings } = require("@/service/chroma");
    queryEmbeddings.mockResolvedValueOnce([]);
    const result = await resolveTimestampForConcept(courseId, "Y");
    expect(result).toBeNull();
  });
});
