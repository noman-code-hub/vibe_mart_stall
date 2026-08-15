import { useNavigate } from 'react-router-dom'
import home1 from '../assets/homepage/1.png'
import home2 from '../assets/homepage/2.png'
import home3 from '../assets/homepage/3.png'
import home4 from '../assets/homepage/4.png'
import home5 from '../assets/homepage/5.png'
import signUpBtn from '../assets/homepage/6.png'
import './HomePage.css'

const HOME_SECTIONS = [
  { src: home1, alt: 'Vibe Mart awning' },
  { src: home2, alt: 'Your stall, your vibe, your future' },
  { src: home3, alt: 'Build your business' },
  { src: home4, alt: 'Welcome to Vibe Mart' },
  { src: home5, alt: 'Join in the fun and earn money' },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <section className="vm-home" aria-label="Home">
      <div className="vm-home__stack">
        {HOME_SECTIONS.map((section, index) => (
          <img
            key={index + 1}
            className={`vm-home__image vm-home__image--${index + 1}`}
            src={section.src}
            alt={section.alt}
            draggable={false}
          />
        ))}

        <div className="vm-home__cta">
          <button
            type="button"
            className="vm-home__signup"
            aria-label="Sign up"
            onClick={() => navigate('/register')}
          >
            <img
              className="vm-home__signup-img"
              src={signUpBtn}
              alt=""
              width={160}
              height={56}
              draggable={false}
            />
          </button>
        </div>
      </div>
    </section>
  )
}
