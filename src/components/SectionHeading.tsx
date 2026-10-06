import { SECTIONS, pad2 } from '../sectionConfig';
import { rv } from './reveal';

interface SectionHeadingProps {
  index: number;
  title: string;
  className?: string;
}

// The last word of each title is set in italic serif, emotion-agency style.
function SectionHeading({ index, title, className = '' }: SectionHeadingProps) {
  const words = title.split(' ');
  const last = words.pop();
  return (
    <header className={`section-heading ${className}`}>
      <p className="eyebrow rv" style={rv(0)}>
        <span>{pad2(index + 1)}</span>
        <span className="eyebrow-line" />
        <span>{SECTIONS[index].place}</span>
      </p>
      <h1 className="section-title rv" style={rv(1)}>
        {words.join(' ')} <em>{last}</em>
      </h1>
    </header>
  );
}

export default SectionHeading;
