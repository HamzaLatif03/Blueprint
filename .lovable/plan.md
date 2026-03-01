

# Blueprint: Backend Migration & Audio Integration Instructions

This plan produces two instruction documents -- one for the **Brev backend** changes and one for the **frontend** changes -- covering three goals:

1. **Move Anthropic Claude edge functions (postgrad-match, recommended-jobs) to Brev**
2. **Pass CV and user profile data from frontend to Brev for searching**
3. **Add audio passthrough from frontend to Brev**

---

## Document 1: Brev Backend Instructions

### 1. New Endpoint: `POST /api/postgrad-match`

**Purpose**: Replaces the Supabase `postgrad-match` edge function. The frontend will now send the user's profile data directly.

**Request body (JSON)**:
```json
{
  "interests": "Machine Learning, NLP",
  "background": "BSc Computer Science, 2:1",
  "degree_type": "both" | "masters" | "phd",
  "education": [
    { "university": "UCL", "degree": "BSc", "field_of_study": "Computer Science", "start_date": "2020-09-01", "end_date": "2023-06-30" }
  ],
  "work_experience": [
    { "company": "Google", "role": "SWE Intern", "description": "Built ML pipeline" }
  ],
  "bio": "Aspiring ML researcher",
  "cv_text": "Extracted CV text or null"
}
```

**Response (JSON)**:
```json
{
  "programmes": [
    {
      "name": "MSc Machine Learning",
      "institution": "University College London",
      "degree_type": "Masters",
      "match_pct": 92,
      "focus": "Deep Learning & NLP",
      "location": "London, UK",
      "url": "https://..."
    }
  ]
}
```

**Implementation notes**:
- Use Claude with `web_search` tool (same pattern as `/api/search-jobs`) to find real programmes with real URLs
- Include education, work experience, bio, and CV text in the prompt for better matching
- Sort results by `match_pct` descending
- If `degree_type` is not "both", filter results to only that type
- Return 4-6 programmes
- Handle `raw.strip()` safely: always do `content or ""` before `.strip()`

---

### 2. New Endpoint: `POST /api/recommended-jobs`

**Purpose**: Replaces the Supabase `recommended-jobs` edge function.

**Request body (JSON)**:
```json
{
  "education": [
    { "university": "UCL", "degree": "BSc", "field_of_study": "Computer Science" }
  ],
  "work_experience": [
    { "company": "Google", "role": "SWE Intern" }
  ],
  "bio": "Aspiring software engineer",
  "cv_text": "Extracted CV text or null"
}
```

**Response (JSON)**:
```json
{
  "jobs": [
    {
      "company": "Google",
      "role": "Graduate SWE",
      "level": "Graduate",
      "location": "London",
      "salary": "£45,000 - £55,000",
      "logo_url": "https://logo.clearbit.com/google.com",
      "url": "https://careers.google.com/...",
      "match_reason": "Strong CS background with ML experience",
      "category": "Technology"
    }
  ]
}
```

**Implementation notes**:
- Use Claude with `web_search` tool to find real, currently open positions
- Include all profile data (education, work, bio, CV text) in the prompt for personalized results
- Return 8-10 jobs
- Use the same Clearbit logo URL pattern: `https://logo.clearbit.com/{domain}`

---

### 3. New Endpoint: `POST /api/evaluate-audio`

**Purpose**: Accept raw audio from the browser's MediaRecorder, transcribe it, then evaluate.

**Request**: `multipart/form-data`
- `audio`: audio file (webm/opus from browser MediaRecorder)
- `question_text`: string
- `thinking_mode`: "practice" | "review"
- `persona_name`: string

**Response (JSON)**: Same as existing `/api/evaluate-answer` response.

**Implementation**:
```python
from fastapi import UploadFile, File, Form

@app.post("/api/evaluate-audio")
async def evaluate_audio(
    audio: UploadFile = File(...),
    question_text: str = Form(...),
    thinking_mode: str = Form("practice"),
    persona_name: str = Form("Interviewer"),
):
    # 1. Read audio bytes
    audio_bytes = await audio.read()
    
    # 2. Transcribe using NVIDIA Parakeet or Whisper
    #    Option A: NVIDIA Riva/Parakeet ASR API
    #    Option B: OpenAI Whisper API via nvidia endpoint
    #    Option C: Use a local whisper model on Brev GPU
    
    # 3. Calculate speech metrics from transcription
    #    - word count, duration, WPM, filler words
    
    # 4. Call the existing evaluate logic with the transcript
    #    (reuse the EvalRequest logic)
    
    # 5. Return combined result
```

**Audio format notes**:
- Browser `MediaRecorder` typically outputs `audio/webm;codecs=opus`
- If using NVIDIA Parakeet ASR, you may need to convert to WAV first (use `ffmpeg` or `pydub`)
- If using OpenAI-compatible whisper endpoint: `nvidia.audio.transcriptions.create(model="nvidia/parakeet-ctc-1.1b", file=audio_bytes)`

---

### 4. Existing Endpoint Fixes

**`/api/evaluate-answer` (line 111)**: Add null safety:
```python
raw = response.choices[0].message.content or ""
```

**`/api/generate-question` (line 67)**: Update model name if needed:
```python
model="nvidia/nvidia-nemotron-nano-9b-v2"
```

---

## Document 2: Frontend Changes

### 1. Postgrad Page (`src/pages/Postgrad.tsx`)

**Change**: Replace `supabase.functions.invoke("postgrad-match")` with a direct fetch to Brev.

- Fetch user's education, work experience, bio, and CV text from the database before calling Brev
- Send all profile data in the request body
- Update the fetch call:

```text
Before: supabase.functions.invoke("postgrad-match", { body: { interests, background, degree_type } })
After:  fetch(`${BACKEND_URL}/api/postgrad-match`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interests, background, degree_type, education, work_experience, bio, cv_text })
        })
```

### 2. Job Tracking Page (`src/pages/JobTracking.tsx`)

**Change**: Replace `supabase.functions.invoke("recommended-jobs")` with a direct fetch to Brev.

```text
Before: supabase.functions.invoke("recommended-jobs", { body: { education, work_experience, bio } })
After:  fetch(`${BACKEND_URL}/api/recommended-jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ education, work_experience, bio, cv_text })
        })
```

### 3. Mock Interviews Page (`src/pages/MockInterviews.tsx`) -- Audio Recording

**Change**: Add optional audio recording using `MediaRecorder` API, and send the recorded audio blob to Brev.

- Add a `useRef` for `MediaRecorder` and an audio chunks array
- When the user clicks the mic button, start both `SpeechRecognition` (for live transcript display) AND `MediaRecorder` (for audio capture)
- When the user submits, send the audio to `POST /api/evaluate-audio` as `FormData` instead of sending text to `/api/evaluate-answer`
- Keep the text-based `/api/evaluate-answer` as a fallback if audio recording fails or is unsupported

```text
// Start recording
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
const chunks = [];
recorder.ondataavailable = (e) => chunks.push(e.data);
recorder.start();

// On submit
recorder.stop();
recorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const formData = new FormData();
  formData.append('audio', blob, 'answer.webm');
  formData.append('question_text', question);
  formData.append('thinking_mode', thinkingMode);
  formData.append('persona_name', persona?.name || 'Interviewer');
  fetch(`${BACKEND_URL}/api/evaluate-audio`, { method: 'POST', body: formData });
};
```

### 4. Add `BACKEND_URL` constant

The mock interviews page already has `const BACKEND_URL = "https://8000-dr39d7fws.brevlab.com"`. This same constant needs to be added to (or shared across) the Postgrad and JobTracking pages.

### 5. Edge Functions to Remove (after migration)

Once the Brev endpoints are confirmed working:
- `supabase/functions/postgrad-match/index.ts` -- no longer needed
- `supabase/functions/recommended-jobs/index.ts` -- no longer needed
- `supabase/functions/interview-ai/index.ts` -- already replaced by Brev endpoints

---

## Summary of All Brev Endpoints (Complete API Surface)

| Method | Path | Purpose | Model |
|--------|------|---------|-------|
| GET | `/health` | Health check | -- |
| POST | `/api/generate-question` | Generate interview question | Nemotron Super 49B + Claude (company research) |
| POST | `/api/evaluate-answer` | Evaluate text transcript | Nemotron Nano (practice) / Super (review) |
| POST | `/api/evaluate-audio` | **NEW** - Transcribe audio then evaluate | ASR model + Nemotron |
| POST | `/api/upload-cv` | Parse CV from image/PDF | Nemotron VL 12B |
| POST | `/api/search-jobs` | Search real job listings | Claude + web search |
| POST | `/api/career-roadmap` | Generate 90-day career plan | Nemotron Super 49B |
| POST | `/api/postgrad-match` | **NEW** - Find matching postgrad programmes | Claude + web search |
| POST | `/api/recommended-jobs` | **NEW** - Personalized job recommendations | Claude + web search |

