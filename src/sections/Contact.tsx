import type { ComponentType, SVGProps } from 'react';
import { ExternalIcon, GithubIcon, LinkedinIcon, MailIcon } from '../components/Icons';
import { rv } from '../components/reveal';

interface ContactMethod {
  id: number;
  type: string;
  label: string;
  url: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

function Contact() {
  const contactLinks: ContactMethod[] = [
    {
      id: 1,
      type: "email",
      label: "justinye787@gmail.com",
      url: "mailto:justinye787@gmail.com",
      Icon: MailIcon,
    },
    {
      id: 2,
      type: "linkedin",
      label: "linkedin.com/in/justin-ye0",
      url: "https://www.linkedin.com/in/justin-ye0/",
      Icon: LinkedinIcon,
    },
    {
      id: 3,
      type: "github",
      label: "github.com/justinye30",
      url: "https://github.com/justinye30",
      Icon: GithubIcon,
    },
  ];

  return (
    <div className="sky-contact">
      <ul className="contact-list">
        {contactLinks.map(({ id, type, label, url, Icon }, index) => (
          <li key={id} className="rv" style={rv(index)}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`contact-link contact-${type}`}
            >
              <span className="contact-icon">
                <Icon />
              </span>
              <span className="contact-label">{label}</span>
              <ExternalIcon className="contact-arrow" width={18} height={18} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Contact;
