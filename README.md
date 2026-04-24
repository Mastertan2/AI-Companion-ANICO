# AI-Companion-ANICO
An AI companion app designed for elderly users that simplifies smartphone use while ensuring safe, dignified independent living. It uses voice and one-tap controls to help seniors make calls, send messages, navigate apps, and access services easily. 

## Set-Up Steps: 
### 1) Clone the repository
### 2) Open the Project
   - Open **Visual Studio Code (VS Code)**.
   - Go to `File > Open Folder...` and select the project folder you just cloned.
   - Open the integrated terminal in VS Code (`Ctrl + ` ` or `View > Terminal`).
### 3) Install dependencies
   - npm install (Type it in Terminal)
### 4) Set up environment variables: To protect our API keys, we use environment variables.
   - Create a .env file in the root directory (touch .env in Terminal)
   - Add your credentials as follows:
     1) OPENAI_API_KEY=your_openai_api_key_here
     2) SEALION_API_KEY=your_sealion_api_key_here
### 5) Running the Application
   - npx expo start (Type in terminal)
     - Download Expo App in your phone device
     - Scan the QR code displayed in your terminal using the Expo Go app (Android) or Camera app (iOS) to view the app on your phone.
## Technical Architecture
Frontend: React Native / Expo (Designed for high-visibility and accessibility).

Core Logic: OpenAI GPT-4o for complex reasoning and intent recognition.

Regional Intelligence: SEA-LION v4 for localized linguistic support (English, Mandarin, Malay, Tamil) and Singapore-specific cultural context.
