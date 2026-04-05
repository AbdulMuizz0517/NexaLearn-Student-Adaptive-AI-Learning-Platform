# NexaLearn - Navigation Guide

## Screen Flow

### Onboarding Flow
1. **Splash Screen** → Auto-navigates after 2.5s to Onboarding
2. **Onboarding Welcome** → Get Started button
3. **Onboarding Why** → Next button
4. **Login Screen** → Login or navigate to Signup

### Authentication Flow
- **Login** → Student Dashboard or Teacher Dashboard (based on email)
  - Tip: Use email with "teacher" to login as teacher
- **Signup Role Selection** → Choose Student or Teacher
- **Signup Student/Teacher** → Complete registration → Dashboard

### Student Dashboard Features
- **AI Tutor** → Chat with AI assistant
- **Your Courses** → Course Library → Course Details → Lesson Viewer
- **Quizzes** → Quiz Home → Quiz Questions → Quiz Results

### Teacher Dashboard Features
- **Manage Courses** → Course Library
- Various teacher actions (Upload, Create, Reports)

## Quick Test Paths

### Test Student Experience
1. Wait for splash screen or refresh
2. Click through onboarding
3. Login with any email (e.g., student@test.com)
4. Explore: AI Tutor, Courses, Quizzes

### Test Teacher Experience
1. Login with email containing "teacher" (e.g., teacher@test.com)
2. View Teacher Dashboard
3. Access course management

### Test Quiz Flow
1. Login as student
2. Click "Quizzes" from dashboard
3. Start quiz → Answer questions → View results

### Test Course Flow
1. Click "Your Courses"
2. Select "Object Oriented Programming"
3. Click on a lesson (e.g., "Inheritance")
4. Mark complete or ask AI
