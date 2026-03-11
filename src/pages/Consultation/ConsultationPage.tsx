import { useState } from 'react'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import avatarSarah from '../../assets/images/avatars/avatar-sarah.svg'
import avatarMichael from '../../assets/images/avatars/avatar-michael.svg'
import avatarEmily from '../../assets/images/avatars/avatar-emily.svg'
import './ConsultationPage.css'

function ConsultationPage() {
  const [message, setMessage] = useState('')

  const messages = [
    { id: 1, sender: 'doctor', text: 'Hello! How can I help you today?', time: '10:30 AM' },
    { id: 2, sender: 'user', text: 'Hi, I have a question about my prescription', time: '10:31 AM' },
    { id: 3, sender: 'doctor', text: 'Sure, I\'d be happy to help. What\'s your question?', time: '10:32 AM' },
  ]

  const doctors = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      specialty: 'General Physician',
      available: true,
      avatar: avatarSarah,
    },
    {
      id: 2,
      name: 'Dr. Michael Chen',
      specialty: 'Cardiologist',
      available: false,
      avatar: avatarMichael,
    },
    {
      id: 3,
      name: 'Dr. Emily Davis',
      specialty: 'Dermatologist',
      available: true,
      avatar: avatarEmily,
    },
  ]

  const handleSend = () => {
    if (message.trim()) {
      setMessage('')
    }
  }

  return (
    <div className="consultation">
      <div className="container">
        <h1>Doctor Consultation</h1>

        <div className="consultation__layout">
          {/* Doctors List */}
          <div className="doctors-sidebar">
            <h2>Available Doctors</h2>
            <div className="doctors-list">
              {doctors.map((doctor) => (
                <div key={doctor.id} className={`doctor-item ${doctor.available ? 'doctor-item--available' : ''}`}>
                  <ImageWithFallback src={doctor.avatar} alt={doctor.name} className="doctor-item__avatar" />
                  <div className="doctor-item__info">
                    <h4>{doctor.name}</h4>
                    <p>{doctor.specialty}</p>
                    <span className={`doctor-status ${doctor.available ? 'doctor-status--online' : 'doctor-status--offline'}`}>
                      {doctor.available ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="chat-container">
            <div className="chat-header">
              <ImageWithFallback src={avatarSarah} alt="Dr. Sarah Johnson" className="chat-header__avatar" />
              <div>
                <h3>Dr. Sarah Johnson</h3>
                <p>General Physician</p>
              </div>
              <span className="chat-status">Online</span>
            </div>

            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message message--${msg.sender}`}>
                  <div className="message__content">
                    <p>{msg.text}</p>
                    <span className="message__time">{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="chat-input">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend} className="btn btn--primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="consultation-info">
          <div className="info-card">
            <h3>💊 Consultation Guidelines</h3>
            <ul>
              <li>Consultations are available 24/7</li>
              <li>Response time: Usually within 5 minutes</li>
              <li>All consultations are confidential</li>
              <li>Prescriptions can be issued digitally</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>⚠️ Emergency Notice</h3>
            <p>For medical emergencies, please call 999 or visit your nearest emergency room immediately.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsultationPage
