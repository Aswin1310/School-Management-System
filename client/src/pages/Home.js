import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>School Management System</h1>
        <p>Select your login type to continue</p>
        
        <div className="login-options">
          <Link to="/student-login" className="login-option student">
            <div className="option-icon">👨‍🎓</div>
            <h2>Student Login</h2>
            <p>Access your student portal</p>
          </Link>

          <Link to="/teacher-login" className="login-option teacher">
            <div className="option-icon">👨‍🏫</div>
            <h2>Teacher Login</h2>
            <p>Access your teacher portal</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
