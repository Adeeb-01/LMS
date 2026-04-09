import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim(),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
  userRole: z.enum(['student', 'instructor'], {
    errorMap: () => ({ message: 'Role must be either student or instructor' })
  })
}).strict().refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
}).strict();

// Course validation schemas (strict: no role, active, instructor, etc.)
export const courseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  subtitle: z.string().max(300).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  category: z.string().optional(),
  thumbnail: z.string().optional()
}).strict();

// Module validation schemas
export const moduleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().optional(),
  courseId: z.string().min(1, 'Course ID is required'),
  order: z.number().int().min(0).optional()
}).strict();

// Lesson validation schemas
export const lessonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().optional(),
  moduleId: z.string().min(1, 'Module ID is required'),
  order: z.number().int().min(0).optional(),
  description: z.string().max(5000).optional(),
  video_url: z.string().max(500).optional(),
  duration: z.number().int().min(0).optional(),
  access: z.enum(['private', 'public']).optional(),
  isFree: z.boolean().optional(),
  videoProvider: z.enum(['local', 'external']).optional(),
  videoFilename: z.string().max(500).optional(),
  videoUrl: z.string().max(500).optional(),
  videoMimeType: z.string().max(100).optional(),
  videoSize: z.number().int().min(0).optional()
}).strict();

// Review validation schemas (strict: no courseId, userId, etc.)
export const reviewSchema = z.object({
  review: z.string().min(1, 'Review is required').max(1000),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5')
}).strict();

// Password change validation
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).strict().refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Profile update validation (strict: no role, id, status - prevents privilege escalation)
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email address'),
  designation: z.string().max(100, 'Designation too long').optional().or(z.literal('')),
  bio: z.string().max(1000, 'Bio too long').optional().or(z.literal('')),
  profilePicture: z.string().max(500, 'Image URL too long').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number too long').optional().or(z.literal(''))
}).strict();

// Avatar upload validation
export const avatarUploadSchema = z.object({
  file: z.instanceof(File, { message: 'File is required' })
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type),
      'File must be an image (JPEG, PNG, or WebP)'
    )
}).strict();

// Admin User Management Schemas
export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['admin', 'instructor', 'student'], {
    errorMap: () => ({ message: 'Invalid role. Must be admin, instructor, or student' })
  })
}).strict();

export const updateUserStatusSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  status: z.enum(['active', 'inactive', 'suspended'], {
    errorMap: () => ({ message: 'Invalid status. Must be active, inactive, or suspended' })
  })
}).strict();

export const deleteUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  confirm: z.boolean().refine(val => val === true, 'Confirmation required')
}).strict();

export const bulkActionSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  action: z.enum(['activate', 'deactivate', 'delete', 'change_role']),
  role: z.enum(['admin', 'instructor', 'student']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
}).strict().refine((data) => {
  if (data.action === 'change_role' && !data.role) {
    return false;
  }
  if ((data.action === 'activate' || data.action === 'deactivate') && !data.status) {
    return false;
  }
  return true;
}, {
  message: 'Missing required fields for this action'
});

// Admin Course Management Schemas
export const updateCourseStatusSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  active: z.boolean()
}).strict();

export const deleteCourseSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  confirm: z.boolean().refine(val => val === true, 'Confirmation required')
}).strict();

export const courseDeleteSchema = z.object({
  deletedAt: z.date().optional().nullable(),
  deletedBy: z.string().optional().nullable()
}).strict();

export const validatePublishRequirements = (course) => {
  const errors = [];
  if (!course.title || course.title.trim().length === 0) errors.push("Title is required");
  if (!course.description || course.description.trim().length === 0) errors.push("Description is required");
  if (!course.thumbnail) errors.push("Thumbnail is required");
  if (!course.category) errors.push("Category is required");
  if (course.price === undefined || course.price === null) errors.push("Price is required");
  
  if (!course.modules || course.modules.length === 0) {
    errors.push("At least one module is required");
  } else {
    // Check lessonIds (the actual field name in Module model)
    const hasLessons = course.modules.some(m => m.lessonIds && m.lessonIds.length > 0);
    if (!hasLessons) errors.push("At least one lesson is required in any module");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Admin Category Schemas
export const createCategorySchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  thumbnail: z.string().optional()
}).strict();

export const updateCategorySchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  thumbnail: z.string().optional()
}).strict();

// Admin Review/Testimonial Schemas
export const updateReviewStatusSchema = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
  approved: z.boolean()
}).strict();

export const deleteReviewSchema = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
  confirm: z.boolean().refine(val => val === true, 'Confirmation required')
}).strict();

// Admin Setup Schema
export const adminSetupSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  setupKey: z.string().min(1, 'Setup key is required')
}).strict();

// File upload validation
export const fileUploadSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  courseId: z.string().optional()
}).strict();

// Payment/Checkout validation
export const checkoutSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required')
}).strict();

// Lesson watch API body (state transition: enrollment checked in route)
export const lessonWatchBodySchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  moduleSlug: z.string().min(1, 'Module slug is required'),
  state: z.enum(['started', 'completed']),
  lastTime: z.number().min(0).optional()
}).strict();

// Lecture Document validation schemas
export const lectureDocumentUploadSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  courseId: z.string().min(1, 'Course ID is required')
}).strict();

export const docxFileSchema = z.object({
  name: z.string().regex(/\.docx$/i, 'File must be a .docx document'),
  size: z.number().max(52428800, 'File must be under 50 MB'),
  type: z.literal('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
}).strict();

// Mock payment confirm API body (strict: no amount, userId, etc.)
export const mockPaymentConfirmSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  simulateFailure: z.boolean().optional()
}).strict();

// Quiz create/update (strict: no courseId, createdBy, etc. - set server-side)
export const quizSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  published: z.boolean().optional(),
  required: z.boolean().optional(),
  passPercent: z.number().min(0).max(100).optional(),
  timeLimitSec: z.number().int().min(0).nullable().optional(),
  maxAttempts: z.number().int().min(0).nullable().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  showAnswersPolicy: z.enum(['after_submit', 'after_deadline', 'never']).optional(),
  adaptiveConfig: z.object({
    enabled: z.boolean().default(false),
    precisionThreshold: z.number().min(0.1).max(1.0).default(0.30),
    minQuestions: z.number().int().min(1).default(5),
    maxQuestions: z.number().int().min(5).default(30),
    contentBalancing: z.object({
      enabled: z.boolean().default(false),
      moduleWeights: z.array(z.object({
        moduleId: z.string(),
        weight: z.number().min(0).max(1)
      })).default([])
    }).optional(),
    initialTheta: z.number().default(0.0)
  }).refine(
    data => data.minQuestions <= data.maxQuestions,
    { message: "minQuestions must be ≤ maxQuestions" }
  ).optional()
}).strict();

// Adaptive answer submission
export const adaptiveAnswerSchema = z.object({
  attemptId: z.string(),
  questionId: z.string(),
  selectedOptionIds: z.array(z.string()),
  deviceId: z.string()
});

// BAT validation schemas
export const batConfigSchema = z.object({
  enabled: z.boolean().default(false),
  blockSize: z.number().min(2).max(5).default(2),
  totalBlocks: z.number().min(3).max(10).default(5),
  initialTheta: z.number().min(-4).max(4).default(0.0)
});

export const batBlockAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionIds: z.array(z.string()).min(1)
});

export const submitBatBlockSchema = z.object({
  attemptId: z.string().min(1),
  answers: z.array(batBlockAnswerSchema).length(2), // Exactly 2 answers per block
  sessionId: z.string().min(1)
});

export const batPoolValidationSchema = z.object({
  easy: z.number().min(4),
  medium: z.number().min(4),
  hard: z.number().min(4)
});

// Question option (for quiz questions)
const questionOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  isCorrect: z.boolean().optional()
}).strict();

export const questionSchema = z.object({
  type: z.enum(['multiple_choice', 'true_false', 'multiple_select', 'oral']),
  text: z.string().min(1),
  options: z.array(questionOptionSchema).optional(),
  correctOptionIds: z.array(z.string()).optional(),
  referenceAnswer: z.string().optional(),
  explanation: z.string().max(1000).optional(),
  points: z.number().int().min(0).optional(),
  irt: z.object({
    a: z.number().gt(0).default(1.0),
    b: z.number().default(0.0),
    c: z.number().min(0).max(1).default(0.0)
  }).default({ a: 1.0, b: 0.0, c: 0.0 })
}).strict().refine((data) => {
  if (data.type === 'oral') {
    return !!data.referenceAnswer && data.referenceAnswer.trim().length > 0;
  }
  return !!data.options && data.options.length >= 2;
}, {
  message: "Oral questions require a reference answer; others require at least 2 options",
  path: ["referenceAnswer"]
});

export const assessmentAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionIds: z.array(z.string()).optional(),
  audioUrl: z.string().url().optional().nullable(),
  skippedDueToMic: z.boolean().optional()
}).strict();

// Alignment validation schemas
export const triggerAlignmentSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  courseId: z.string().min(1, 'Course ID is required')
}).strict();

export const adjustTimestampSchema = z.object({
  blockIndex: z.number().int().min(0),
  startSeconds: z.number().min(0).nullable(),
  endSeconds: z.number().min(0).nullable()
}).strict().refine(
  data => data.startSeconds === null || data.endSeconds === null || 
          data.startSeconds <= data.endSeconds,
  { message: 'Start time must be before end time', path: ['startSeconds'] }
);

// Semantic Search and Indexing validation schemas
export const semanticSearchQuerySchema = z.object({
  query: z.string()
    .min(3, 'Query must be at least 3 characters')
    .max(500, 'Query must be under 500 characters'),
  courseId: z.string().min(1, 'Course ID is required'),
  limit: z.number().int().min(1).max(10).default(5),
  threshold: z.number().min(0).max(1).default(0.7)
}).strict();

export const searchResultSchema = z.object({
  chunkId: z.string(),
  score: z.number().min(0).max(1),
  text: z.string(),
  headingPath: z.string(),
  lessonId: z.string(),
  lessonTitle: z.string(),
  courseId: z.string()
});

export const searchResponseSchema = z.object({
  query: z.string(),
  results: z.array(searchResultSchema),
  totalMatches: z.number().int().min(0),
  searchTimeMs: z.number().int().min(0)
});

export const triggerIndexingSchema = z.object({
  lectureDocumentId: z.string().min(1, 'Document ID is required')
}).strict();

// MCQ Generation validation schemas
export const triggerGenerationSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  quizId: z.string().optional().or(z.literal('')),
  chunkIds: z.array(z.string()).optional()
}).strict();

export const generationJobStatusSchema = z.object({
  jobId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  progress: z.object({
    chunksTotal: z.number().int().min(0),
    chunksProcessed: z.number().int().min(0),
    questionsGenerated: z.number().int().min(0),
    questionsFlagged: z.number().int().min(0),
    percentComplete: z.number().min(0).max(100)
  }),
  errors: z.array(z.object({
    chunkId: z.string(),
    error: z.string()
  })).optional(),
  completedAt: z.string().datetime().optional()
});

export const generatedQuestionSchema = z.object({
  text: z.string().min(10, 'Question text too short'),
  options: z.array(z.object({
    id: z.string(),
    text: z.string().min(1)
  })).min(4).max(5),
  correctOptionId: z.string(),
  explanation: z.string(),
  difficulty: z.object({
    bValue: z.number().min(-3).max(3),
    bloomLevel: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']),
    reasoning: z.string()
  })
});

export const geminiResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(0).max(10),
  skipped: z.boolean().optional().default(false),
  reason: z.string().optional()
});

// Pipeline and Oral Generation validation schemas
export const triggerPipelineSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required')
}).strict();

export const retryPipelineStageSchema = z.object({
  pipelineJobId: z.string().min(1, 'Pipeline job ID is required'),
  stage: z.enum(['extraction', 'alignment', 'indexing', 'mcqGeneration', 'oralGeneration'])
}).strict();

export const triggerOralGenerationSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required')
}).strict();

export const referenceAnswerSchema = z.object({
  keyPoints: z.array(z.string()).min(1, 'At least one key point required'),
  requiredTerminology: z.array(z.string()).optional().default([]),
  acceptableVariations: z.array(z.string()).optional().default([]),
  gradingCriteria: z.string().optional().default(''),
  sampleResponse: z.string().optional().default('')
}).strict();

export const oralQuestionSchema = z.object({
  text: z.string().min(10, 'Question must be at least 10 characters'),
  cognitiveLevel: z.enum(['application', 'analysis', 'synthesis', 'evaluation']),
  referenceAnswer: referenceAnswerSchema,
  difficulty: z.object({
    bValue: z.number().min(-3).max(3),
    reasoning: z.string()
  }),
  estimatedResponseTime: z.string().optional()
}).strict();

// Oral Assessment Submission Schema
export const oralAssessmentSubmissionSchema = z.object({
  assessmentId: z.string().min(1, 'Assessment ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  transcription: z.string().optional(),
  textResponse: z.string().optional(),
  audioUrl: z.string().url().optional(),
  inputMethod: z.enum(['voice', 'text']),
  attemptNumber: z.number().int().min(1)
}).strict().refine(data => {
  if (data.inputMethod === 'voice') return !!data.transcription || !!data.audioUrl;
  return !!data.textResponse;
}, {
  message: "Missing response content for the selected input method"
});

// RAG Tutor Query Schema
export const ragTutorQuerySchema = z.object({
  question: z.string().max(1000, 'Question too long').optional(),
  audioUrl: z.string().url().optional(),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  inputMethod: z.enum(['voice', 'text'])
}).strict().refine(data => {
  if (data.inputMethod === 'voice') return !!data.audioUrl || !!data.question;
  return !!data.question && data.question.length >= 3;
}, {
  message: "Missing question content"
});

// Recite-Back Submission Schema
export const reciteBackSubmissionSchema = z.object({
  interactionId: z.string().min(1, 'Interaction ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  recitation: z.string().optional(),
  audioUrl: z.string().url().optional(),
  inputMethod: z.enum(['voice', 'text']),
  attemptNumber: z.number().int().min(1).max(3)
}).strict().refine(data => {
  if (data.inputMethod === 'voice') return !!data.audioUrl || !!data.recitation;
  return !!data.recitation && data.recitation.length >= 1;
}, {
  message: "Missing recitation content"
});

