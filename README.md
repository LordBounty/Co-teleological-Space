# Co-Teleological Interaction Prototype

This is a research prototype designed to explore **Co-Teleological Interaction** — a paradigm where humans and AI collaboratively define, reflect on, and evolve goals over time. 
The prototype enables:
- Generation of **multiple AI responses per user input**, each following a distinct tone or perspective
- Iterative and reflective interactions via a **multi-branch conversation interface**
- A **"Journey" panel** that visualizes the dialogue tree and key decision points
- **Summary generation** of all branches for sense-making
- **Image generation** using DALL·E
- Export of the entire session as a `.doc` file

This system has been developed as part of an academic investigation, code files are structured to support direct review and experimentation.


# There are two ways to experience the prototype
### Option 1： Go directly to **www.co-teleological.space**；
### Option 2： Deploy/run it locally；

## How to deploy/Run Locally

### 1. Make sure all files are ready
Files list:
```
project-root/
├── static/
│   ├── script.js
│   ├── styles.css
│   └── other image assets
├── templates/
│   └── index.html
└── server.py
```
   

### 2. Set up the Environment
Configuration in the terminal：

python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install flask openai

### 3. Set the API Key
In **server.py**, set your OpenAI API key: eg. openai.api_key = 'sk-xxxxx'

### 4. Run the Application
In terminal:  python server.py
Then open a browser and go to http://127.0.0.1:5000 (localhost)

