# Learning Management System (LMS)

A modern Learning Management System built with Next.js 15, supporting course creation, student enrollment, quiz management, progress tracking, and certificate generation. Designed for educational institutions and online learning platforms.

## Key Features

- **Role-based Access Control**: Admin, Instructor, and Student roles with appropriate permissions
- **Course Management**: Create courses with modules, lessons, and video content
- **Quiz System**: Create quizzes for courses and lessons with multiple question types and auto-grading
- **DOCX Text Extraction**: Upload Word documents (.docx) for lessons and automatically extract structured text.
- **Semantic Search**: Natural language search across course materials. Students can ask questions and receive relevant content segments from indexed lecture documents, ranked by similarity.
- **Text-Video Sync**: AI-powered pipeline that synchronizes Word documents with lecture videos. Enables students to click any paragraph to jump to that moment in the video and automatically propagates timestamps to generated quiz questions.
- **Adaptive Testing (IRT)**: Intelligent quiz system using Item Response Theory (3PL model). Dynamically selects questions based on student ability (θ), estimates ability using EAP estimation after each response, and terminates efficiently when measurement precision is achieved. Includes instructor analytics for ability distribution and question drift detection.
- **Block-Based Adaptive Testing (BAT)**: Advanced adaptive mode that groups questions into difficulty-matched blocks of 2. θ is recalculated after each block submission rather than per-question, reducing server load and providing a more cohesive student experience. Includes fixed-length termination (5 blocks/10 questions) and diagnostic concept gap analysis for missed questions.
- **Enrollment & Payments**: MockPay integration for simulated payments (demo/testing)
- **Progress Tracking**: Monitor student progress through courses and lessons
- **Certificates**: Generate PDF certificates upon course completion
- **Dashboards**: Comprehensive admin and instructor dashboards with analytics
- **AI Content Pipeline**: Unified orchestration that extracts text from DOCX, synchronizes it with video timestamps, generates semantic embeddings in ChromaDB, and automatically creates both MCQs (with IRT parameters) and oral questions for any lesson with a single click. Includes a real-time progress dashboard with retry capability and error handling.
- **AI-Driven Remediation Dashboard**: Personalized weakness tracking that aggregates conceptual gaps from BAT assessments and oral recitations into a unified student profile. Features priority scoring (frequency, recency, source diversity), deep-link video playback at exact timestamps where concepts are explained, automatic resolution tracking when students pass subsequent assessments, and anonymized class-level analytics for instructors.

## AI Content Pipeline Usage

Instructors can trigger the automated content pipeline from the lesson management dashboard:

1. **Upload Materials**: Add a video file and a `.docx` lecture document to a lesson.
2. **Launch Pipeline**: Click "Trigger AI Content Pipeline" in the lesson's sidebar.
3. **Monitor Progress**: Watch real-time stage updates:
   - **Extraction**: DOCX to structured JSON
   - **Alignment**: Text-to-video timestamp synchronization
   - **Indexing**: Vector embedding generation for semantic search
   - **Generation**: Parallel creation of MCQs and oral questions
4. **Review & Publish**: Review generated questions, edit as needed, and add them to your quiz.

Note: Requires `GEMINI_API_KEY` in environment variables.

## AI Remediation Dashboard

Students can access their personalized remediation dashboard to review concepts they struggled with:

1. **Access Dashboard**: Navigate to Dashboard → Remediation and select a course.
2. **View Weaknesses**: See a prioritized list of conceptual gaps aggregated from BAT and oral assessments.
3. **Review Concepts**: Click "Review Concept" to jump directly to the video timestamp where that concept is explained.
4. **Track Progress**: Weaknesses are automatically marked as "resolved" when you pass a subsequent assessment covering that concept.

**For Instructors**: View anonymized class-level weakness patterns on the course management page to identify concepts that need additional attention across all students.

Note: Requires `GEMINI_API_KEY` for video timestamp resolution via semantic search.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Server Actions
- **Database**: MongoDB with Mongoose, ChromaDB (Vector database)
- **Authentication**: NextAuth v5
- **Validation**: Zod, React Hook Form
- **AI/ML**: Google Gemini (Semantic Embeddings), OpenAI Whisper (via Transformers.js), fuzzy string matching for timestamp synchronization, mathjs (numerical integration for IRT)
- **Other**: mammoth (DOCX extraction), fluent-ffmpeg (audio processing), PDF generation, Video player, Rich text editor, Email service (Resend)

## Quick Start

1. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd LMS-main
npm install
```

2. Create a `.env` file:
```env
# Database Connections
MONGODB_CONNECTION_STRING=mongodb://localhost:27017/lms
CHROMA_HOST=http://localhost:8000           # Optional: ChromaDB for semantic search
CHROMA_COLLECTION=lms_embeddings            # Optional: Default collection name
DB_HEALTH_INTERVAL_MS=30000                 # Optional: Health check cache duration

# AI Services
GEMINI_API_KEY=your-gemini-api-key-here     # Required for Semantic Search

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Services
RESEND_API_KEY=your-resend-api-key           # Optional: Email service
REMEDIATION_AGGREGATE_SECRET=your-secret     # Optional: Internal API auth for remediation jobs
```

3. Run the development server:
```bash
npm run dev
```

4. Visit [http://localhost:3000](http://localhost:3000) and create an admin account at `/setup/admin`

## Payment System

The system uses **MockPay**, a virtual payment system for demonstration and testing. MockPay simulates payment processing without real payment credentials, making it ideal for development and demonstrations. The architecture is designed to easily integrate real payment gateways when needed.

## Project Structure

```
app/                    # Next.js pages and routes
  ├── (main)/           # Public pages
  ├── admin/            # Admin dashboard
  ├── dashboard/        # Instructor/Student dashboard
  │   ├── courses/      # Course management
  │   └── remediation/  # AI remediation dashboard
  ├── actions/          # Server actions
  └── api/              # API routes
components/             # React components
lib/                    # Utilities and helpers
  ├── irt/              # Adaptive testing algorithms
  └── remediation/      # Weakness aggregation & priority scoring
model/                  # Mongoose models
service/                # Background jobs & external services
queries/                # Database queries
```

## License

MIT
