import { isDuplicateOral } from '@/lib/oral-generation/duplicate-detector';

describe('Oral Duplicate Detector', () => {
  it('should flag highly similar questions as duplicates', async () => {
    const q1 = { text: "Explain the importance of testing in software development." };
    const q2 = { text: "Explain why testing is important in the process of software development." };
    
    // This will fail because isDuplicateOral is not yet implemented
    const result = await isDuplicateOral(q1, [q2], 0.90);
    expect(result).toBe(true);
  });

  it('should not flag conceptually similar but distinct questions as duplicates', async () => {
    const q1 = { text: "Explain the importance of testing in software development." };
    const q2 = { text: "Describe the different types of testing used in software development." };
    
    const result = await isDuplicateOral(q1, [q2], 0.90);
    expect(result).toBe(false);
  });
});
