import { formatNumber } from '../utils/format';

type GradeChipsProps = {
  grades: Array<{ grade: string; quantityKg: string }>;
};

export function GradeChips({ grades }: GradeChipsProps) {
  if (!grades.length) {
    return <span className="muted">-</span>;
  }

  return (
    <div className="grade-list">
      {grades.map((grade) => (
        <span className="grade-chip" key={grade.grade}>
          {grade.grade}: {formatNumber(grade.quantityKg)} กก.
        </span>
      ))}
    </div>
  );
}

