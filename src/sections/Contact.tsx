interface ContactMethod {
  id: number;
  type: string;
  label: string;
  url: string;
  icon: string;
}

function Contact() {
  const contactLinks: ContactMethod[] = [
    {
      id: 1,
      type: "email",
      label: "justin.example@gmail.com",
      url: "mailto:justin.example@gmail.com",
      icon: "✉",
    },
    {
      id: 2,
      type: "linkedin",
      label: "linkedin.com/in/justin-example/",
      url: "https://linkedin.com/in/justin-example/",
      icon: "in",
    },
    {
      id: 3,
      type: "github",
      label: "github.com/justin-example",
      url: "https://github.com/justin-example",
      icon: "🐙",
    },
  ];

  return (
    <section id="contact">
      <h1 className="contact-title">Contact Me</h1>
      
      <div className="contact-list">
        {contactLinks.map((link) => (
          <div key={link.id} className="contact-item">
            <div className={`contact-icon-badge badge-${link.type}`}>
              <span>{link.icon}</span>
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