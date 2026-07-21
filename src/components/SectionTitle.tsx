import { useEffect, useRef, useState } from 'react';
import Typewriter from 'typewriter-effect';

interface SectionTitleProps {
  text: string;
  className: string;
}

function SectionTitle({ text, className }: SectionTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <h1 className={className} ref={ref}>
      {visible ? (
        <Typewriter
          onInit={(typewriter) => {
            typewriter
              .typeString(text)
              .callFunction(({ elements }) => {
                elements.cursor.style.display = 'none';
              })
              .start();
          }}
          options={{
            loop: false,
            delay: 40,
          }}
        />
      ) : (
        <span>&nbsp;</span>
      )}
    </h1>
  );
}

export default SectionTitle;
