import emailIcon from '../assets/icon-email.png';
import githubIcon from '../assets/icon-github.png';
import linkedinIcon from '../assets/icon-linkedin.png';

interface ContactMethod {
  id: number;
  type: string;
  label: string;
  url: string;
  iconImg: string;
}

function Contact() {
  const contactLinks: ContactMethod[] = [
    {
      id: 1,
      type: "email",
      label: "justinye787@gmail.com",
      url: "mailto:justinye787@gmail.com",
      iconImg: emailIcon,
    },
    {
      id: 2,
      type: "linkedin",
      label: "linkedin.com/in/justin-ye0",
      url: "https://www.linkedin.com/in/justin-ye0/",
      iconImg: linkedinIcon,
    },
    {
      id: 3,
      type: "github",
      label: "github.com/justinye30",
      url: "https://github.com/justinye30",
      iconImg: githubIcon,
    },
  ];

  return (
    <section id="contact">
      <h1 className="contact-title">Contact Me</h1>
      
      <div className="contact-list">
        {contactLinks.map((link) => (
          <div key={link.id} className="contact-item">
            <div className={`contact-icon-badge badge-${link.type}`}>
              <img 
                src={link.iconImg} 
                alt={`${link.type} icon`} 
                className="contact-icon-image"
              />
            </div>
            
            <a 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="contact-link"
            >
              {link.label}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Contact;