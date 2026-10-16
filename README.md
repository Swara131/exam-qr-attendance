# ExamQR

QR-Based Exam Conduction and Attendance System. Teachers create exams and display a unique QR code. Students scan that code to mark attendance. The server checks the code, the exam, and the time window, and it refuses a second scan from the same student.

## Run it locally

You need Node.js 18 or newer.

```powershell
cd C:\Users\swara\OneDrive\Desktop\cep
npm install
npm run dev
```

Open http://localhost:5173

On Vercel, set the project Root Directory to `client`. The same deployment serves the pages and the `/api` routes. Without `MONGODB_URI`, the live site uses the sample class in memory so the demo accounts can sign in. Add a MongoDB Atlas connection string in the Vercel environment variables if created exams should be kept.

`npm install` installs the root tools, the React app, and the API. `npm run dev` starts both:

- Web app: http://localhost:5173
- API: http://localhost:5000

Vite prints a Network URL as well. Open that address on a phone connected to the same Wi-Fi, sign in as a student, and scan the QR code shown on the laptop.

## Demo accounts

| Role | ID | Password |
| --- | --- | --- |
| Teacher | TCH001 | teacher123 |
| Student | STU001 to STU005 | student123 |

STU003 (Priya Sharma) has not been marked yet, so that account is the easiest way to record new attendance. STU001 and STU002 are already present for the sample midterm, which is useful for showing the duplicate check.

## Suggested demo

1. Sign in as the teacher. The dashboard shows 5 students, 3 exams, and today's attendance.
2. Open Manage Exams. The Data Structures midterm already has a QR code. The Lab Quiz and the Operating Systems final do not.
3. Open the midterm QR code. You can download it as a PNG.
4. Create another exam if you want. The time defaults to a few minutes ago so students can scan immediately.
5. Sign out and sign in as STU003.
6. Open Attendance. Start the camera, or use **Simulate scan** if the camera is blocked. Choose the midterm. Attendance is marked.
7. Simulate the midterm again. The server refuses the duplicate.
8. Simulate the Lab Quiz. The server says that exam has no QR code yet.
9. Sign in as the teacher, generate a QR code for the Final Examination, then sign in as STU004 and simulate that scan. The server rejects it because the attendance window is not open yet.
10. Sign in as the teacher and open Attendance. The new midterm row is listed with the student ID, name, exam, and status.

## How attendance is checked

Each QR code contains `CEP1.<random exam token>.<signature>`. It identifies the exam. It does not contain a student's attendance status.

Before a record is saved, the API:

- requires a signed-in student
- accepts attendance only for that student's own ID
- checks the signature
- finds the matching exam
- allows the scan only from 30 minutes before the start until 2 hours after
- rejects a second record for the same student and exam

Sample exam times are refreshed when the server starts, so the midterm stays inside the open window during a demonstration.

## MongoDB

The API tries `MONGODB_URI` from `server/.env`. The included file points at a local database:

```
MONGODB_URI=mongodb://127.0.0.1:27017/exam_qr
```

If MongoDB is running, exams, students, and attendance are stored there. If it is not running, the API keeps the demo in `server/data/db.json` and the dashboard says so. To use only the file, remove `MONGODB_URI` from `server/.env`.

A copy of the settings is in `server/.env.example`. Change `JWT_SECRET` before any real deployment. Demo passwords are hashed, but they are still classroom passwords and should not be reused.

## Production-style start

```powershell
npm run build
npm start
```

This builds the React app and serves it from the API at http://localhost:5000.

## Project layout

```
client/   React, Vite, and Tailwind
server/   Express API, MongoDB, and the local file fallback
```

The three pages are Dashboard, Manage Exams, and Attendance. Sign-in is only there so the teacher and student flows can be tested.
