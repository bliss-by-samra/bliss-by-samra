BLISS WEB STARTER — IMPORTANT
This is an early starter, not a finished/live BLISS platform. It currently provides a mauve/pink landing page and Firebase email/password signup, login and logout. Collaborators, chats, support exchanges, file uploads, Help Desk workflow, announcement permissions and moderation are NOT implemented yet.

FILES
- index.html / style.css: starter website design
- app.js: Firebase email/password authentication
- firebase-config.example.js: template for your Firebase web app settings

SETUP (ask a trusted adult/sister to help)
1. In Firebase Console, open Project settings > General > Your apps > Bliss Web App > SDK setup and configuration > Config.
2. Copy the values into firebase-config.example.js, then save a copy named firebase-config.js in the same folder.
3. Do not share Google passwords, private account information, or member data. Firebase web config identifies the project but is not a password.
4. In Firebase Authentication, enable Email/Password.
5. Keep Firestore rules locked until the app's database features and privacy rules have been properly designed.
6. This starter does not need Firestore yet. Do not publish open/test database rules.
7. To preview locally, use a static web server that supports ES modules. Opening index.html directly as a file may not work.
8. Before public launch, deploy using a supported HTTPS host and have a trusted adult review privacy, moderation, age requirements, and security.

SECURITY
- Never ask members for Instagram passwords.
- Do not store private email addresses in public member profiles.
- Do not use client-side checks as the only admin protection.
- Real-time chat and user-generated uploads need additional rules, abuse reporting, blocking, and moderation before launch.
- Do not collect phone numbers, home addresses, school details, or other unnecessary sensitive information.
