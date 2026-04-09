import { generateOralQuestions } from '@/lib/oral-generation/generator';

describe('Oral Question Generator', () => {
  it('should generate open-ended questions from content', async () => {
    const content = "This is a long content about testing oral question generation. It has more than one hundred words to pass the filter requirement which is essential for high quality oral questions that require deep thinking and analysis from the students. We want to ensure that the AI model produces questions that are not just simple definitions but actually challenge the understanding of the concepts presented in the material. This is why we have this 100 word minimum limit for the oral generation process. Let's add some more words to be absolutely sure we hit the limit. Programming is the process of creating a set of instructions that tell a computer how to perform a task. It can be done using a variety of computer programming languages, such as Python, Java, and C++.";
    
    // This will fail because generateOralQuestions is not yet implemented
    const questions = await generateOralQuestions({ content, cognitiveLevel: 'analysis' });
    
    expect(questions).toBeDefined();
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0].text).toContain('?');
    expect(questions[0].cognitiveLevel).toBe('analysis');
    expect(questions[0].referenceAnswer.keyPoints.length).toBeGreaterThan(0);
  });
});
