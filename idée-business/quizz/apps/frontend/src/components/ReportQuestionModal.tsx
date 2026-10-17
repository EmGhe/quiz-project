import { useState } from 'react';
import { dailyApi } from '@/api/daily';

interface ReportQuestionModalProps {
  questionId: string;
  questionText: string;
  onClose: () => void;
  onSuccess: () => void;
}

const REPORT_REASONS = [
  { value: 'incorrect_answer', label: 'Réponse incorrecte' },
  { value: 'ambiguous', label: 'Question ambiguë' },
  { value: 'typo', label: 'Faute de frappe' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'other', label: 'Autre' },
];

export default function ReportQuestionModal({
  questionId,
  questionText,
  onClose,
  onSuccess,
}: ReportQuestionModalProps) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      setError('Veuillez sélectionner une raison');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await dailyApi.reportQuestion(questionId, reason, comment || undefined);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du signalement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Signaler une question
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Question : <span className="font-medium">{questionText}</span>
        </p>

        <form onSubmit={handleSubmit}>
          {/* Reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raison du signalement *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">-- Sélectionnez une raison --</option>
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Comment */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commentaire (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Détails supplémentaires..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/500 caractères
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Envoi...' : 'Signaler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
