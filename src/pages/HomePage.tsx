import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Professional Navigation Bar
const Navigation: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-gray-900/95 backdrop-blur-xl border-b border-gray-800' : ''
    }`}>
      <nav className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">SC</span>
              </div>
              <span className="font-orbitron font-bold text-xl text-white">Space Colony Exchange</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('demo')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Demo
            </button>
            <button
              onClick={() => scrollToSection('testimonials')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Success Stories
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Contact
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

// Hero Section
const HeroSection: React.FC = () => {
  
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.1)_0%,_transparent_50%)]" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.2) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="font-bold text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-tight">
            Transform Team Dynamics Through
            <span className="block bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
              Immersive Space Trading
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed">
            A cutting-edge negotiation simulation that builds critical teamwork, strategic thinking, and communication skills through high-stakes interstellar commerce.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-lg rounded-lg hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:-translate-y-1"
            >
              Watch Demo
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700 text-white font-semibold text-lg rounded-lg hover:bg-gray-800/70 hover:border-gray-600 transition-all duration-300 transform hover:-translate-y-1"
            >
              Explore Features
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-cyan-400 mb-2">500+</div>
              <div className="text-gray-400">Teams Trained</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-cyan-400 mb-2">45-75</div>
              <div className="text-gray-400">Minutes Duration</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-cyan-400 mb-2">10-360</div>
              <div className="text-gray-400">Participants</div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center pt-2"
        >
          <div className="w-1 h-3 bg-gray-600 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

// Features Section
const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: '🚀',
      title: 'Real-Time Trading Engine',
      description: 'Fast-paced negotiations with live market dynamics. Teams must adapt quickly to changing conditions while managing critical resources under time pressure.'
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description: 'Comprehensive post-session reports revealing team decision-making patterns, leadership styles, and collaboration effectiveness for meaningful debriefs.'
    },
    {
      icon: '🎯',
      title: 'Scalable Sessions',
      description: 'Seamlessly handle events from 10 to 360+ participants across multiple concurrent sessions with powerful facilitator monitoring tools.'
    },
    {
      icon: '🛡️',
      title: 'Enterprise Ready',
      description: 'Built for corporate environments with robust security, detailed reporting, and integration capabilities for your existing L&D infrastructure.'
    },
    {
      icon: '⚡',
      title: 'Instant Setup',
      description: 'Quick event creation with templates, bulk participant management, and automated game code generation. Focus on facilitation, not technical setup.'
    },
    {
      icon: '🎮',
      title: 'Immersive Experience',
      description: 'Stunning glassmorphism interface with space-themed visuals that enhance engagement while maintaining professional credibility.'
    }
  ];

  return (
    <section id="features" className="py-24 bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Why Space Colony Exchange?
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Designed specifically for corporate team building with measurable learning outcomes and comprehensive facilitator tools.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-gray-600 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 text-3xl">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Demo Section
const DemoSection: React.FC = () => {
  return (
    <section id="demo" className="py-24 bg-black/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              See It In Action
            </h2>
            <p className="text-xl text-gray-400 mb-6 leading-relaxed">
              Watch how teams navigate complex resource management, negotiate under pressure, and adapt to crisis scenarios in this immersive trading simulation.
            </p>
            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
              Each session generates unique behavioral insights that translate directly to workplace effectiveness and team performance improvement.
            </p>
            <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-lg rounded-lg hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:-translate-y-1">
              Request Live Demo
            </button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-2xl blur-3xl" />
            <div className="relative bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=600&h=400&fit=crop&crop=entropy&cs=tinysrgb" 
                alt="Space Colony Interface Preview"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent flex items-end p-8">
                <div>
                  <div className="text-white font-semibold text-lg mb-2">Interactive Trading Interface</div>
                  <div className="text-gray-300 text-sm">Real-time market dynamics with intuitive controls</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Testimonials Section
const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      quote: "The most engaging team-building experience we've ever used. The analytics provided actionable insights that we're still applying months later.",
      author: "Sarah Mitchell",
      role: "Head of L&D, TechCorp",
      avatar: "SM"
    },
    {
      quote: "Incredible how quickly it revealed our team dynamics. The negotiation pressure exposed leadership patterns we never noticed in regular meetings.",
      author: "Raj Kumar",
      role: "Team Lead, Innovation Labs",
      avatar: "RK"
    },
    {
      quote: "Perfect balance of fun and learning. Our executives were fully engaged, and the debrief session generated the best team discussions we've had.",
      author: "Amanda Lee",
      role: "HR Director, Global Solutions",
      avatar: "AL"
    }
  ];

  return (
    <section id="testimonials" className="py-24 bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Trusted by Leading Organizations
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Hear from L&D professionals and team leaders who have transformed their teams through Space Colony Exchange.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8"
            >
              <div className="mb-6">
                <svg className="w-10 h-10 text-cyan-500 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>
              <p className="text-gray-300 italic mb-6 leading-relaxed">"{testimonial.quote}"</p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="text-white font-semibold">{testimonial.author}</div>
                  <div className="text-gray-400 text-sm">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// CTA Section
const CTASection: React.FC = () => {
  return (
    <section id="contact" className="py-24 bg-gradient-to-r from-cyan-900/20 to-blue-900/20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Team?
          </h2>
          <p className="text-xl text-gray-300 mb-12 leading-relaxed">
            Join hundreds of organizations using Space Colony Exchange to build stronger, more collaborative teams through immersive learning experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-lg rounded-lg hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:-translate-y-1">
              Start Free Trial
            </button>
            <button className="px-8 py-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700 text-white font-semibold text-lg rounded-lg hover:bg-gray-800/70 hover:border-gray-600 transition-all duration-300 transform hover:-translate-y-1">
              Schedule Consultation
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Footer
const Footer: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-6 md:mb-0">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a>
            <button
              onClick={() => navigate('/admin/login')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Admin Portal
            </button>
          </div>
          <div className="text-gray-400 text-sm">
            © 2025 Tryitowl LLP. All rights reserved. | Powered by innovative learning experiences
          </div>
        </div>
      </div>
    </footer>
  );
};

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <DemoSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};