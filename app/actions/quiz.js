"use server"
import { Quizset } from "@/model/quizset-model";
import { getSlug, replaceMongoIdInArray } from './../../lib/convertData';
import { createQuiz, getQuizSetById } from "@/queries/quizzes";
import { Quiz } from "@/model/quizzes-model";
import mongoose from "mongoose";
import { Assessment } from "@/model/assessment-model";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { createAssessmentReport } from "@/queries/reports";


export async function updateQuizSet(quizset, dataToUpdate){
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await Quizset.findByIdAndUpdate(quizset, dataToUpdate);

    } catch (error) {
        throw new Error(error?.message || 'Failed to update quiz set');
    }
}

export async function addQuizToQuizSet(quizSetId, quizData){
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        // Validate that exactly one option is correct
        const correctCount = [
            quizData.optionA?.isTrue,
            quizData.optionB?.isTrue,
            quizData.optionC?.isTrue,
            quizData.optionD?.isTrue
        ].filter(Boolean).length;
        
        if (correctCount !== 1) {
            throw new Error('Exactly one option must be marked as correct');
        }
        
        const transformedQuizData = {};
        transformedQuizData["title"] = quizData["title"];
        transformedQuizData["description"] = quizData["description"] || '';
        transformedQuizData["slug"] = getSlug(quizData["title"]);
        transformedQuizData["options"] = [
            {
                text: quizData.optionA.label,
                is_correct: quizData.optionA.isTrue  
            },
            {
                text: quizData.optionB.label,
                is_correct: quizData.optionB.isTrue  
            },
            {
                text: quizData.optionC.label,
                is_correct: quizData.optionC.isTrue  
            },
            {
                text: quizData.optionD.label,
                is_correct: quizData.optionD.isTrue  
            }, 
        ];

        const createdQuizId = await createQuiz(transformedQuizData);

        const quizSet = await Quizset.findById(quizSetId);
        if (!quizSet) {
            throw new Error('Quiz set not found');
        }
        
        quizSet.quizIds.push(createdQuizId);
        await quizSet.save();
    } catch (error) {
        throw new Error(error?.message || 'Failed to add quiz to quiz set');
    }
}


export async function deleteQuiz(quizSetId, quizId) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await Quizset.findByIdAndUpdate(quizSetId, {
            $pull: {quizIds: quizId } 
        });

        await Quiz.findByIdAndDelete(quizId);
        
    } catch (error) {
        throw new Error(error?.message || 'Failed to delete quiz');
    }
}


export async function changeQuizPublishState(quizSetId) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        const quiz = await Quizset.findById(quizSetId);
        if (!quiz) {
            throw new Error('Quiz set not found');
        }
        
        const res = await Quizset.findByIdAndUpdate(
            quizSetId, 
            [{ $set: { active: { $not: "$active" } } }],
            { new: true, lean: true }
        );
        return res?.active ?? false;
    } catch (error) {
        throw new Error(error?.message || 'Failed to change quiz publish state');
    }
}

export async function doCreateQuizSet(data){
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        if (!data.title) {
            throw new Error('Title is required');
        }
        
        data['slug'] = getSlug(data.title);
        const createdQuizSet = await Quizset.create(data);
        return createdQuizSet?._id.toString();
    } catch (error) {
        throw new Error(error?.message || 'Failed to create quiz set');
    }
}

export async function addQuizAssessment(courseId, quizSetId, answers) {
    try {
        const loggedInUser = await getLoggedInUser();
        if (!loggedInUser) {
            throw new Error('Unauthorized: Please log in');
        }
        
        if (!courseId || !quizSetId) {
            throw new Error('Course ID and Quiz Set ID are required');
        }
        
        const quizSet = await getQuizSetById(quizSetId);
        if (!quizSet) {
            throw new Error('Quiz set not found');
        }
        
        const quizzes = replaceMongoIdInArray(quizSet.quizIds);

        const assessmentRecord = quizzes.map((quiz) => {
            const obj = {};
            obj.quizId = new mongoose.Types.ObjectId(quiz.id);
            const found = answers.find((a) => a.quizId === quiz.id);
            if (found) {
                obj.attempted = true;
            } else {
                obj.attempted = false;
            }

            const mergedOptions = quiz.options.map((o) => {
                return {
                    option: o.text,
                    isCorrect: o.is_correct, 
                    isSelected: (function () {
                        const found = answers.find((a) => a.options?.[0]?.option === o.text);
                        if (found) {
                            return true;
                        } else {
                            return false;
                        }
                    })(),
                };
            }); 
            
            obj["options"] = mergedOptions;
            return obj;  
        });

        const assessmentEntry = {};
        assessmentEntry.assessments = assessmentRecord;
        assessmentEntry.otherMarks = 0;

        const assessment = await Assessment.create(assessmentEntry);

        await createAssessmentReport({ 
            courseId: courseId, 
            userId: loggedInUser.id, 
            quizAssessment: assessment?._id 
        }); 

    } catch (error) {
        throw new Error(error?.message || 'Failed to create quiz assessment');
    }
}