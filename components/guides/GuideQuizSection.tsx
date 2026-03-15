'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { featureFlags } from '@/lib/config/feature-flags';
import { Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ILocalized {
  en: string;
  he: string;
}

interface QuizQuestion {
  question: ILocalized;
  options: ILocalized[];
  explanation?: ILocalized;
  order: number;
}

interface PublicQuiz {
  quizId: string;
  guideSlug: string;
  questions: QuizQuestion[];
  passingScore: number;
  xpReward: number;
}

interface Attempt {
  passed: boolean;
  score: number;
  xpAwarded: boolean;
  xpAmount: number;
}

function getLocalized(obj: ILocalized | undefined, locale: string): string {
  if (!obj) return '';
  return obj[locale as 'en' | 'he'] || obj.en || '';
}

/**
 * Simple confetti for quiz pass
 */
function ConfettiAnimation() {
  const [pieces, setPieces] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    const p = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
    }));
    setPieces(p);
    const t = setTimeout(() => setPieces([]), 5000);
    return () => clearTimeout(t);
  }, []);

  if (pieces.length === 0) return null;
  const colors = ['bg-yellow-400', 'bg-blue-400', 'bg-red-400', 'bg-green-400', 'bg-purple-400'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className={`absolute top-0 w-2 h-2 rounded-full ${colors[piece.id % 5]}`}
          style={{
            left: `${piece.left}%`,
            animation: `guide-quiz-fall ${piece.duration}s ${piece.delay}s ease-in forwards`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes guide-quiz-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export interface GuideQuizSectionProps {
  slug: string;
  locale: string;
  inModal?: boolean;
  onClose?: () => void;
}

export function GuideQuizSection({
  slug,
  locale,
  inModal = false,
  onClose,
}: GuideQuizSectionProps) {
  const { data: session, status } = useSession();
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [quizLoading, setQuizLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    passed: boolean;
    score: number;
    correctCount: number;
    totalCount: number;
    xpEarned: number;
  } | null>(null);
  const [confetti, setConfetti] = useState(false);

  const fetchQuiz = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/guides/${encodeURIComponent(slug)}/quiz`);
      if (res.ok) {
        const data = await res.json();
        setQuiz(data);
      } else {
        setQuiz(null);
      }
    } catch {
      setQuiz(null);
    } finally {
      setQuizLoading(false);
    }
  }, [slug]);

  const fetchAttempt = useCallback(async () => {
    if (!slug || status !== 'authenticated') {
      setQuizLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/guides/${encodeURIComponent(slug)}/quiz/attempt`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAttempt(data.attempt || null);
      }
    } catch {
      // ignore
    } finally {
      setQuizLoading(false);
    }
  }, [slug, status]);

  useEffect(() => {
    if (!featureFlags.guideQuizzes || !slug) {
      setQuizLoading(false);
      return;
    }
    setQuizLoading(true);
    fetchQuiz();
  }, [slug, fetchQuiz]);

  useEffect(() => {
    if (!featureFlags.guideQuizzes || !slug || status === 'loading' || !quiz) return;
    if (status === 'unauthenticated') return;
    fetchAttempt();
  }, [slug, status, quiz, fetchAttempt]);

  // When opened in modal, go straight to quiz (no extra "Take the Quiz" click)
  useEffect(() => {
    if (inModal && quiz && status === 'authenticated' && !attempt?.passed && !submitResult) {
      setShowQuiz(true);
    }
  }, [inModal, quiz, status, attempt?.passed, submitResult]);

  const selectAnswer = (optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = optionIndex;
      return next;
    });
  };

  const nextStep = () => {
    if (!quiz) return;
    if (step < quiz.questions.length - 1) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const submitQuiz = async () => {
    if (!quiz || submitting) return;
    const filled = quiz.questions.length === answers.filter((a) => a !== undefined && a >= 0).length;
    if (filled < quiz.questions.length) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guides/${encodeURIComponent(slug)}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult(data);
        if (data.passed && data.xpEarned) {
          setConfetti(true);
          setAttempt({
            passed: true,
            score: data.score,
            xpAwarded: true,
            xpAmount: data.xpEarned,
          });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!featureFlags.guideQuizzes) {
    if (inModal) {
      return (
        <section className="py-8">
          <p className="text-center text-gray-600 dark:text-gray-400">
            {locale === 'he' ? 'בוחנים אינם זמינים כרגע.' : 'Quizzes are not available at the moment.'}
          </p>
        </section>
      );
    }
    return null;
  }

  if (quizLoading) {
    if (inModal) {
      return (
        <section className="py-8 flex flex-col items-center justify-center gap-4 min-h-[180px]">
          <LoadingSpinner size={32} />
          <p className="text-center text-gray-600 dark:text-gray-400">
            {locale === 'he' ? 'טוען בוחן...' : 'Loading quiz...'}
          </p>
        </section>
      );
    }
    return null;
  }

  if (!quiz) {
    if (inModal) {
      return (
        <section className="py-8 min-h-[120px]">
          <p className="text-center text-gray-600 dark:text-gray-400">
            {locale === 'he' ? 'אין בוחן למדריך זה.' : 'No quiz available for this guide.'}
          </p>
        </section>
      );
    }
    return null;
  }

  const questions = quiz.questions.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totalQuestions = questions.length;
  const isLastStep = step === totalQuestions - 1;
  const canProceed = answers[step] !== undefined && answers[step] >= 0;

  const sectionClass = inModal ? '' : 'mt-12 pt-8 border-t border-gray-200 dark:border-gray-800';

  if (status === 'unauthenticated') {
    return (
      <section className={sectionClass}>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
          {locale === 'he' ? 'התחבר כדי לפתור את הבוחן ולהרוויח XP' : 'Log in to take the quiz and earn XP'}
        </p>
        <div className="flex justify-center">
          <Button variant="primary" asChild>
            <Link href={`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/guides/${slug}`)}`}>
              {locale === 'he' ? 'התחבר' : 'Log in'}
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  if (attempt?.passed && attempt.xpAwarded && !submitResult) {
    return (
      <section className={sectionClass}>
        <div className="text-center rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6">
          <p className="text-lg font-semibold text-green-800 dark:text-green-200">
            {locale === 'he' ? 'בוחן הושלם ✓' : 'Quiz completed ✓'}
          </p>
          <p className="text-green-700 dark:text-green-300 mt-1">
            {locale === 'he' ? `הרווחת ${attempt.xpAmount} XP` : `You earned ${attempt.xpAmount} XP`}
          </p>
        </div>
      </section>
    );
  }

  if (submitResult) {
    return (
      <>
        {confetti && <ConfettiAnimation />}
        <section className={sectionClass}>
          <div
            className={`text-center rounded-2xl p-6 border ${
              submitResult.passed
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
            }`}
          >
            <p className="text-lg font-semibold">
              {submitResult.passed
                ? locale === 'he'
                  ? 'עברת!'
                  : 'You passed!'
                : locale === 'he'
                  ? 'לא עברת הפעם'
                  : "You didn't pass this time"}
            </p>
            <p className="mt-1 text-gray-700 dark:text-gray-300">
              {submitResult.correctCount}/{submitResult.totalCount} {locale === 'he' ? 'נכון' : 'correct'}
              {!submitResult.passed &&
                ` — ${locale === 'he' ? 'נדרש' : 'Passing score'}: ${quiz.passingScore}%`}
            </p>
            {submitResult.passed && submitResult.xpEarned > 0 && (
              <p className="mt-2 font-medium text-green-700 dark:text-green-300">
                +{submitResult.xpEarned} XP
              </p>
            )}
            {!submitResult.passed && (
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => {
                  setSubmitResult(null);
                  setStep(0);
                  setAnswers([]);
                  setShowQuiz(true);
                }}
              >
                {locale === 'he' ? 'נסה שוב' : 'Try Again'}
              </Button>
            )}
          </div>
        </section>
      </>
    );
  }

  if (!showQuiz) {
    return (
      <section className={sectionClass}>
        <div className="text-center">
          <Button variant="primary" onClick={() => setShowQuiz(true)}>
            {locale === 'he' ? 'פתח את הבוחן' : 'Take the Quiz'}
          </Button>
        </div>
      </section>
    );
  }

  const currentQ = questions[step];
  const optionTexts = currentQ.options.map((o) => getLocalized(o, locale));

  return (
    <section className={sectionClass}>
      <div className="rounded-2xl bg-card dark:bg-card-dark border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
          {locale === 'he' ? `שאלה ${step + 1} מתוך ${totalQuestions}` : `Question ${step + 1} of ${totalQuestions}`}
        </p>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {getLocalized(currentQ.question, locale)}
        </h3>
        <div className="space-y-3">
          {optionTexts.map((text, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => selectAnswer(idx)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                answers[step] === idx
                  ? 'border-brand-main dark:border-brand-dark bg-brand-main/10 dark:bg-brand-dark/10'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <span className="font-medium">{text || (locale === 'he' ? `אפשרות ${idx + 1}` : `Option ${idx + 1}`)}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-6">
          <Button variant="gray" onClick={prevStep} disabled={step === 0}>
            {locale === 'he' ? 'הקודם' : 'Previous'}
          </Button>
          {isLastStep ? (
            <Button
              variant="primary"
              onClick={submitQuiz}
              disabled={!canProceed || submitting}
            >
              {submitting ? (locale === 'he' ? 'שולח...' : 'Submitting...') : locale === 'he' ? 'שלח' : 'Submit'}
            </Button>
          ) : (
            <Button variant="primary" onClick={nextStep} disabled={!canProceed}>
              {locale === 'he' ? 'הבא' : 'Next'}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
