# Quickstart: Testing the Oral Question Feature

To test the new oral question feature locally, you will need to configure the required environment variables for OpenAI and Cloud Storage.

## Prerequisites

1.  **OpenAI API Key**: You need an active OpenAI account with credits to use the Whisper and GPT models.
2.  **Cloud Storage**: An AWS S3 bucket (or compatible service like Cloudflare R2) configured for direct uploads via pre-signed URLs. CORS must be configured on the bucket to allow PUT requests from your localhost.

## Environment Variables

Add the following to your `.env.local` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Cloud Storage Configuration (e.g., AWS S3)
STORAGE_ACCESS_KEY_ID=your-access-key
STORAGE_SECRET_ACCESS_KEY=your-secret-key
STORAGE_REGION=us-east-1
STORAGE_BUCKET_NAME=your-bucket-name
STORAGE_PUBLIC_URL=https://your-cdn-or-s3-url.com
```

## Testing Flow

### 1. Instructor Flow (Create Question)
1. Log in as an Instructor.
2. Navigate to course/assessment creation.
3. Add a new question and select the type "Oral".
4. Fill in the question prompt and provide a detailed `referenceAnswer`.
5. Save the assessment.

### 2. Student Flow (Answer Question)
1. Log in as a Student.
2. Start the assessment containing the oral question.
3. Grant microphone permissions when prompted by the browser.
4. Record an answer (speak clearly to match the intent of the `referenceAnswer`).
5. Stop the recording and submit.
6. Verify that the UI indicates the answer is "Pending Grading".

### 3. Verification (Backend & DB)
1. Check your terminal logs to ensure the async evaluation job started.
2. Verify the raw audio file was successfully uploaded to your cloud storage bucket.
3. Check the MongoDB `answers` collection to see the `transcribedText`, `score`, and `gradingStatus` updated to `completed`.
