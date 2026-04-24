/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  PenTool, 
  Headphones, 
  Mic2, 
  Trophy, 
  LayoutDashboard, 
  BarChart3,
  Flame,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { UserProgress, SkillType, DailyExercise } from './types';
import { generateDailyStimulation, evaluateWriting, runFullAssessment, generateSpeech } from './services/geminiService';

const INITIAL_PROGRESS: UserProgress = {
  level: 'Beginner (A1)',
  streak: 0,
  skillScores: { reading: 0, writing: 0, listening: 0, speaking: 0 },
  history: []
};

export default function App() {
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('lingorise_progress');
    return saved ? JSON.parse(saved) : INITIAL_PROGRESS;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'stimulation' | 'assessment'>('dashboard');
  const [selectedSkill, setSelectedSkill] = useState<SkillType | null>(null);
  const [currentExercise, setCurrentExercise] = useState<DailyExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem('lingorise_progress', JSON.stringify(progress));
  }, [progress]);

  const handleStartStimulation = async (skill: SkillType) => {
    setLoading(true);
    setSelectedSkill(skill);
    const exercise = await generateDailyStimulation(skill, progress.level);
    setCurrentExercise(exercise);
    
    if (skill === 'listening' && exercise?.content) {
      const speech = await generateSpeech(exercise.content);
      if (speech) {
        setAudioUrl(speech);
      } else {
        // No-API Fallback: Use Browser Speech Synthesis
        setAudioUrl('native-tts'); 
      }
    } else {
      setAudioUrl(null);
    }

    setActiveTab('stimulation');
    setLoading(false);
    setFeedback(null);
    setAnswers({});
  };

  const toggleAudio = () => {
    if (audioUrl === 'native-tts') {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(currentExercise?.content || '');
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSubmitExercise = async () => {
    if (!currentExercise) return;
    
    setLoading(true);
    let totalScore = 0;
    let feedbackText = '';

    if (currentExercise.skill === 'writing') {
      const responseText = answers[0] || '';
      const evaluation = await evaluateWriting(responseText, progress.level);
      totalScore = evaluation?.score || 50;
      feedbackText = evaluation?.feedback || 'Good effort!';
    } else if (currentExercise.questions) {
      let correctCount = 0;
      currentExercise.questions.forEach((q, idx) => {
        if (answers[idx] === q.correctAnswer) correctCount++;
      });
      totalScore = (correctCount / currentExercise.questions.length) * 100;
      feedbackText = `You got ${correctCount} out of ${currentExercise.questions.length} correct.`;
    } else {
      totalScore = 80;
      feedbackText = 'Exercise completed successfully!';
    }

    setFeedback(feedbackText);
    
    const newProgress = {
      ...progress,
      skillScores: {
        ...progress.skillScores,
        [currentExercise.skill]: Math.round((progress.skillScores[currentExercise.skill] + totalScore) / (progress.skillScores[currentExercise.skill] === 0 ? 1 : 2))
      },
      history: [
        ...progress.history,
        { date: new Date().toISOString(), skill: currentExercise.skill, score: totalScore, type: 'stimulation' as const }
      ]
    };

    const today = new Date().toDateString();
    if (progress.lastCompletedDate !== today) {
      newProgress.streak = progress.streak + 1;
      newProgress.lastCompletedDate = today;
    }

    setProgress(newProgress);
    setLoading(false);
  };

  const handleAssessment = async () => {
    setLoading(true);
    const result = await runFullAssessment(progress.history);
    if (result) {
      setProgress(prev => ({
        ...prev,
        level: result.overallLevel,
        skillScores: result.scores,
        history: [
            ...prev.history,
            { date: new Date().toISOString(), skill: 'reading', score: result.scores.reading, type: 'assessment' }
        ]
      }));
      setFeedback(`Status: ${result.overallLevel}. AI Analysis: ${result.feedback}`);
      setActiveTab('assessment');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#2D3748] font-sans antialiased overflow-x-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] grid-rows-[80px_1fr] min-h-screen h-full w-full">
        
        {/* Header */}
        <header className="col-span-full bg-white flex items-center justify-between px-8 border-b border-[#E2E8F0] z-50">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 bg-[#2C5282] rounded-lg flex items-center justify-center text-white font-black text-xl shadow-sm">
              L
            </div>
            <h1 className="text-2xl font-extrabold tracking-tighter text-[#2C5282]">LusyEnglish</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-sm font-bold leading-tight">Lusy Syarifah</p>
              <p className="text-xs text-[#718096] font-medium">Premium Learner • {progress.level}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#CBD5E0] border-2 border-[#2C5282] ring-4 ring-[#EBF8FF] overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Lusy" alt="avatar" />
            </div>
          </div>
        </header>

        {/* Navigation Sidebar */}
        <aside className="hidden lg:flex flex-col bg-white border-r border-[#E2E8F0] p-6 justify-between">
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`nav-item-geometric w-full flex items-center gap-3 ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button className="nav-item-geometric w-full flex items-center gap-3">
              <BookOpen className="w-4 h-4" />
              <span>Course Material</span>
            </button>
            <button className="nav-item-geometric w-full flex items-center gap-3">
              <RotateCcw className="w-4 h-4" />
              <span>History</span>
            </button>
          </nav>

          <div className="mt-auto pt-6 border-t border-[#F7FAFC]">
            <div className="bg-gradient-to-br from-[#2C5282] to-[#4299E1] rounded-2xl p-4 text-white shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-orange-400 fill-orange-400" />
                <span className="font-bold text-sm">7 Day Streak!</span>
              </div>
              <p className="text-xs opacity-90 leading-normal font-medium">Keep up the great work, Lusy. You are in the top 5% of learners this week.</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="p-4 md:p-8 overflow-y-auto bg-[#F0F4F8]">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 max-w-4xl mx-auto"
              >
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-extrabold text-[#2D3748]">Hello, Lusy! 👋</h2>
                    <p className="text-[#718096] font-medium mt-1">Choose a module to start your practice session today.</p>
                  </div>
                  <div className="bg-[#EDF2F7] px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider text-[#2C5282]">
                    LEVEL: {progress.level}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { id: 'speaking', title: 'Speaking', desc: 'Practice with AI Tutor', icon: Mic2, time: '15 Min', color: 'text-blue-500 bg-blue-50' },
                    { id: 'listening', title: 'Listening', desc: 'Audio clips + HOTS', icon: Headphones, time: '10 Min', color: 'text-purple-500 bg-purple-50' },
                    { id: 'writing', title: 'Writing', desc: 'Creative prompts', icon: PenTool, time: '20 Min', color: 'text-red-500 bg-red-50' },
                    { id: 'reading', title: 'Reading', desc: 'SMA/STEM Articles', icon: BookOpen, time: '12 Min', color: 'text-green-500 bg-green-50' },
                  ].map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => handleStartStimulation(skill.id as SkillType)}
                      className="geometric-card flex flex-col justify-between text-left h-[200px]"
                    >
                      <div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${skill.color}`}>
                          <skill.icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-1">{skill.title}</h3>
                        <p className="text-sm text-[#718096] font-medium">{skill.desc}</p>
                      </div>
                      <div className="text-[10px] font-black tracking-widest text-[#4299E1] uppercase bg-[#EBF8FF] self-start px-2 py-1 rounded">
                        {skill.time} • Daily Stimulus
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'stimulation' && (
              <motion.div
                key="stimulation"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="flex items-center gap-2 text-[#718096] hover:text-[#2C5282] font-bold text-sm transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>BACK TO DASHBOARD</span>
                  </button>
                  <div className="text-[10px] font-black uppercase tracking-widest bg-[#2D3748] text-white px-3 py-1 rounded-full">
                    {selectedSkill} SESSION
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
                    <div className="relative">
                       <Loader2 className="w-16 h-16 animate-spin text-[#2C5282]" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 bg-[#2C5282] rounded-full animate-ping" />
                       </div>
                    </div>
                    <div>
                      <p className="font-black text-xl text-[#2D3748]">Assembling Content...</p>
                      <p className="text-[#718096] font-medium mt-1">Generating custom SMA {selectedSkill} stimulus with AI.</p>
                    </div>
                  </div>
                ) : currentExercise ? (
                  <div className="space-y-6">
                    <div className="bg-white rounded-[32px] p-8 md:p-12 border border-[#E2E8F0] shadow-sm">
                      <header className="mb-10 text-center md:text-left">
                        <h1 className="text-4xl font-extrabold tracking-tight text-[#2D3748] leading-tight">{currentExercise.title}</h1>
                        <div className="h-1.5 w-16 bg-[#2C5282] mt-4 rounded-full mx-auto md:mx-0" />
                        <p className="text-[#718096] mt-6 text-lg font-normal leading-relaxed italic">
                          {currentExercise.instruction}
                        </p>
                      </header>

                      {selectedSkill === 'listening' && audioUrl && (
                        <div className="mb-10 p-8 bg-[#F7FAFC] rounded-3xl border-2 border-dashed border-[#CBD5E0] flex flex-col items-center gap-6">
                          <div className="w-20 h-20 bg-white shadow-lg rounded-full flex items-center justify-center border border-[#E2E8F0]">
                             <Headphones className="w-8 h-8 text-[#2C5282]" />
                          </div>
                          <div className="text-center">
                            <p className="font-black text-[#2D3748]">Audio Ready</p>
                            <p className="text-sm text-[#718096] font-medium">Listen carefully to the passage twice.</p>
                          </div>
                          <button 
                            onClick={toggleAudio}
                            className="bg-[#2C5282] text-white w-full max-w-xs py-4 rounded-2xl flex items-center justify-center gap-3 font-bold hover:scale-[1.02] transition-transform active:scale-95"
                          >
                             {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                             <span>{isPlaying ? 'PAUSE STORY' : 'PLAY STORY'}</span>
                          </button>
                          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                        </div>
                      )}

                      <div className={`prose prose-slate max-w-none text-xl leading-relaxed text-[#2D3748] mb-12 ${selectedSkill === 'listening' ? 'hidden' : ''}`}>
                        {currentExercise.content.split('\n').map((para, i) => para && (
                          <p key={i} className="mb-6 first-letter:text-5xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-[#2C5282]">{para}</p>
                        ))}
                      </div>

                      <div className="space-y-12">
                        {currentExercise.questions ? (
                          currentExercise.questions.map((q, qIdx) => (
                            <div key={qIdx} className="space-y-6">
                              <h3 className="text-2xl font-black flex items-center gap-4">
                                <span className="bg-[#2C5282] text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">{qIdx + 1}</span>
                                {q.text}
                              </h3>
                              <div className="grid gap-3">
                                {q.options.map((option, oIdx) => (
                                  <button
                                    key={oIdx}
                                    onClick={() => setAnswers(prev => ({ ...prev, [qIdx]: option }))}
                                    disabled={!!feedback}
                                    className={`p-5 rounded-2xl border-2 text-left transition-all font-bold text-lg ${
                                      answers[qIdx] === option 
                                        ? 'border-[#2C5282] bg-[#EBF8FF] text-[#2C5282]' 
                                        : 'border-[#EDF2F7] hover:border-[#CBD5E0] text-[#718096]'
                                    } ${feedback && option === q.correctAnswer ? 'bg-green-50 border-green-500 text-green-700' : ''}`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="space-y-4">
                             <h3 className="text-2xl font-black">Your Creative Response</h3>
                             <textarea
                                value={answers[0] || ''}
                                onChange={(e) => setAnswers({ 0: e.target.value })}
                                disabled={!!feedback}
                                placeholder="Type your full essay or response here..."
                                className="w-full h-72 p-8 rounded-3xl border-2 border-[#EDF2F7] focus:border-[#2C5282] focus:ring-0 outline-none text-xl font-medium placeholder-[#CBD5E0] transition-colors resize-none"
                              />
                          </div>
                        )}

                        {!feedback && (
                          <button
                            onClick={handleSubmitExercise}
                            disabled={Object.keys(answers).length === 0 || loading}
                            className="btn-geometric-primary w-full py-6 rounded-2xl text-xl flex items-center justify-center gap-3"
                          >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6" /> SUBMIT SESSION</>}
                          </button>
                        )}

                        {feedback && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#2D3748] text-white p-8 rounded-[2rem] space-y-6 shadow-2xl relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                               <CheckCircle2 className="w-32 h-32" />
                            </div>
                            <div className="flex items-center gap-3 text-[#4299E1] font-black uppercase tracking-widest text-sm">
                              <BarChart3 className="w-5 h-5" />
                              <span>Smarter Feedback</span>
                            </div>
                            <p className="text-2xl font-bold leading-snug relative z-10">{feedback}</p>
                            <button
                              onClick={() => setActiveTab('dashboard')}
                              className="w-full bg-white text-[#2D3748] py-5 rounded-2xl font-black text-lg hover:bg-[#EDF2F7] transition-colors"
                            >
                              RETURN TO DASHBOARD
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}

            {activeTab === 'assessment' && (
               <motion.div
                key="assessment"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-2xl mx-auto space-y-8 py-12"
              >
                  <div className="bg-white rounded-[40px] p-12 border border-[#E2E8F0] shadow-sm text-center">
                    <div className="w-24 h-24 bg-[#EBF8FF] text-[#2C5282] rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                      <BarChart3 className="w-12 h-12" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-[#2D3748]">Skill Assessment</h1>
                    <p className="text-[#718096] text-lg font-medium mt-3 max-w-xs mx-auto">
                      AI Deep-Analysis of your performance history.
                    </p>

                    <div className="mt-12 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-6 bg-[#F7FAFC] rounded-2xl border border-[#EDF2F7]">
                            <p className="text-[10px] font-black text-[#718096] uppercase tracking-widest mb-1">STREAK</p>
                            <p className="text-2xl font-bold">{progress.streak} Days</p>
                         </div>
                         <div className="p-6 bg-[#F7FAFC] rounded-2xl border border-[#EDF2F7]">
                            <p className="text-[10px] font-black text-[#718096] uppercase tracking-widest mb-1">RECORDS</p>
                            <p className="text-2xl font-bold">{progress.history.length}</p>
                         </div>
                      </div>

                      {feedback ? (
                        <div className="text-left bg-[#2D3748] text-white p-8 rounded-3xl space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-4">
                            <h4 className="font-black text-2xl text-[#4299E1]">Diagnostics: {progress.level}</h4>
                            <p className="text-lg leading-relaxed font-light opacity-90 italic">"{feedback}"</p>
                            <button 
                                onClick={() => { setActiveTab('dashboard'); setFeedback(null); }}
                                className="w-full bg-white text-[#2D3748] py-4 rounded-xl font-black text-lg shadow-xl"
                            >
                                CONTINUE LEARNING
                            </button>
                        </div>
                      ) : (
                        <button 
                            onClick={handleAssessment}
                            className="w-full bg-[#2C5282] text-white py-6 rounded-3xl font-black text-xl mt-8 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50"
                            disabled={loading || progress.history.length === 0}
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'GENERATE AI REPORT'}
                        </button>
                      )}
                      
                      {progress.history.length === 0 && !feedback && (
                        <div className="mt-6 flex items-center justify-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest">
                           <Loader2 className="w-4 h-4" />
                           Unlock by completing a stimulus
                        </div>
                      )}
                    </div>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right Stats Sidebar */}
        <aside className="hidden lg:flex flex-col bg-white border-l border-[#E2E8F0] p-8 gap-10">
           <section>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#718096] mb-6">DAILY STIMULATION</p>
              <div className="bg-gradient-to-br from-[#2C5282] to-[#4299E1] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Trophy className="w-32 h-32" />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Next Challenge</p>
                 <h4 className="text-xl font-extrabold mb-3 leading-tight">Advanced STEM Phrasal Verbs</h4>
                 <p className="text-xs opacity-90 leading-relaxed font-medium">Science & Technology contexts await today's practice.</p>
              </div>
           </section>

           <section>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#718096] mb-6">PROGRESS DIAGRAM</p>
              <div className="flex items-end gap-2 h-44 px-2 bg-[#F7FAFC] rounded-2xl pt-6 pb-2 border border-[#EDF2F7]">
                 {[40, 65, 55, 85, 95, 70, 75].map((h, i) => (
                   <div key={i} className="flex-1 flex flex-col items-center gap-2">
                     <div 
                        className={`w-full rounded-t-lg transition-all duration-500 ${i === 4 ? 'bg-[#48BB78] opacity-100 shadow-[0_-4px_10px_rgba(72,187,120,0.3)]' : 'bg-[#4299E1] opacity-30 hover:opacity-50'}`} 
                        style={{ height: `${h}%` }} 
                      />
                   </div>
                 ))}
              </div>
              <div className="flex justify-between mt-6 px-1">
                 <div className="text-center">
                    <p className="text-xl font-black text-[#2D3748]">88%</p>
                    <p className="text-[9px] font-black text-[#718096] uppercase tracking-tighter">AVG SCORE</p>
                 </div>
                 <div className="text-center">
                    <p className="text-xl font-black text-[#2D3748]">{progress.history.length}</p>
                    <p className="text-[9px] font-black text-[#718096] uppercase tracking-tighter">SESSIONS</p>
                 </div>
              </div>
           </section>

           <button 
              onClick={handleAssessment}
              className="btn-geometric-primary w-full py-5 rounded-2xl flex items-center justify-center gap-3 mt-auto text-sm"
            >
             <BarChart3 className="w-4 h-4" />
             FINAL ASSESSMENT
           </button>
        </aside>

      </div>
    </div>
  );
}
