import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DailyExercise } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const STATIC_EXERCISES: Record<string, DailyExercise[]> = {
  reading: [
    {
      id: 'stem-1',
      skill: 'reading',
      title: 'The Impact of Quantum Computing on Cybersecurity',
      instruction: 'Read this complex article about computing and answer the HOTS questions.',
      content: `Quantum computing marks a significant leap from classical computing, shifting from binary bits to 'qubits' that exploit the principles of superposition and entanglement. For high school students interested in STEM, understanding the threat this poses to modern cryptography is crucial. Contemporary encryption, like RSA, relies on the mathematical difficulty of factoring large prime numbers—a task that would take classical supercomputers millennia. However, Shor's algorithm, running on a sufficiently powerful quantum computer, could decrypt such codes in seconds. This 'Quantum Apocalypse' necessitates a transition to post-quantum cryptography (PQC), using lattice-based math that resistant to quantum attacks. Indonesian STEM enthusiasts must lead this transition to safeguard national digital infrastructure.`,
      questions: [
        {
          text: "Based on the text, why is classical RSA encryption vulnerable to quantum processors?",
          options: [
            "Because RSA uses binary bits instead of qubits.",
            "Shor's algorithm can factor large primes exponentially faster than classical methods.",
            "Quantum computers are faster at addition and subtraction.",
            "RSA relies on lattice-based mathematics which is weak."
          ],
          correctAnswer: "Shor's algorithm can factor large primes exponentially faster than classical methods."
        },
        {
          text: "What does the term 'Quantum Apocalypse' imply in the context of STEM and cybersecurity?",
          options: [
            "The physical destruction of classical computer hardware.",
            "A future where all currently encrypted data becomes instantly readable by adversaries.",
            "The end of the internet due to power consumption.",
            "A religious event sparked by technological progress."
          ],
          correctAnswer: "A future where all currently encrypted data becomes instantly readable by adversaries."
        }
      ]
    }
  ],
  listening: [
    {
      id: 'listening-1',
      skill: 'listening',
      title: 'Green Hydrogen: The Future of Energy',
      instruction: 'Listen to the explanation about renewable energy and identify the core process mentioned.',
      content: "Green hydrogen is produced through electrolysis, using renewable energy sources like wind or solar to split water into hydrogen and oxygen. Unlike blue hydrogen, which is derived from natural gas, green hydrogen is carbon-free. The biggest hurdle remains the efficiency of the electrolyzers and the high cost of the platinum-group metals required for the catalysts.",
      questions: [
        {
          text: "What is the primary difference between green and blue hydrogen according to the speaker?",
          options: [
            "The color of the final gas product.",
            "Green hydrogen is carbon-free because it uses renewable energy.",
            "Blue hydrogen is more efficient to store.",
            "Green hydrogen is produced from natural gas."
          ],
          correctAnswer: "Green hydrogen is carbon-free because it uses renewable energy."
        }
      ]
    }
  ],
  speaking: [
     {
        id: 'speak-1',
        skill: 'speaking',
        title: 'Debating AI Ethics',
        instruction: 'Record a 2-minute speech addressing the prompt below.',
        content: 'Should AI be allowed to make decisions in healthcare without human oversight? Consider the balance between efficiency and empathy.',
        questions: [{ text: 'Record your stance', options: [], correctAnswer: '' }]
     }
  ],
  writing: [
     {
        id: 'write-1',
        skill: 'writing',
        title: 'Space Exploration Debate',
        instruction: 'Write a persuasive essay of at least 250 words.',
        content: 'Is funding space exploration more important than solving environmental issues on Earth? Provide STEM-based arguments.',
        questions: [{ text: 'Submit your essay', options: [], correctAnswer: '' }]
     }
  ]
};

export const generateDailyStimulation = async (skill: string, level: string) => {
  // Use static fallback if API key is missing or to provide "No-API" content
  if (!process.env.GEMINI_API_KEY || STATIC_EXERCISES[skill]) {
     const skillPool = STATIC_EXERCISES[skill] || STATIC_EXERCISES['reading'];
     return skillPool[Math.floor(Math.random() * skillPool.length)];
  }
  const prompt = `Generate a daily English learning "stimulation" exercise for ${skill} at CEFR level ${level}. 
  
  CRITICAL CONSTRAINTS:
  - If skill is 'reading': The text MUST be 400-600 words long, suitable for Indonesian High School (SMA) students, focusing on STEM or contemporary global issues. 
  - If skill is 'reading': Include 3-5 HOTS (Higher Order Thinking Skills) questions that require analysis, evaluation, or synthesis.
  - If skill is 'listening': The content should be a clear script (30-60 seconds when read) that can be converted to speech.
  
  Return the result in JSON format with the following structure:
  {
    "title": "Exercise Title",
    "content": "The main text, story, or script",
    "questions": [
      {
        "text": "The question",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": "The correct option"
      }
    ],
    "instruction": "Brief instructions for the student"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            questions: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING }
                }
              }
            },
            instruction: { type: Type.STRING },
          },
          required: ["title", "content", "instruction"],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error generating daily stimulation:", error);
    return null;
  }
};

export const generateSpeech = async (text: string) => {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say clearly and naturally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
    return null;
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
};

export const evaluateWriting = async (text: string, level: string) => {
  const prompt = `Evaluate the following English writing text for a student at level ${level}:
  "${text}"
  Provide feedback on grammar, vocabulary, and flow. Give a score from 0-100.
  Return JSON: { "score": number, "feedback": "string", "corrections": ["string"] }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            corrections: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error evaluating writing:", error);
    return null;
  }
};

export const runFullAssessment = async (currentHistory: any) => {
    const prompt = `Based on the following English learning history, provide a full assessment of the student's progress and CEFR level:
    ${JSON.stringify(currentHistory)}
    Return JSON: {
      "overallLevel": "e.g., B2",
      "feedback": "detailed progress summary",
      "scores": { "reading": number, "writing": number, "listening": number, "speaking": number },
      "recommendedNextSteps": ["string"]
    }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallLevel: { type: Type.STRING },
            feedback: { type: Type.STRING },
            scores: { 
                type: Type.OBJECT,
                properties: {
                    reading: { type: Type.NUMBER },
                    writing: { type: Type.NUMBER },
                    listening: { type: Type.NUMBER },
                    speaking: { type: Type.NUMBER },
                }
            },
            recommendedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error running assessment:", error);
    return null;
  }
};
