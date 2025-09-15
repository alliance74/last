import { Heart, Twitter, Instagram, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border/10 bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold gradient-text">RizzChat</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Level up your chat game with AI-powered rizz lines that actually work.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/#features" className="hover:text-primary transition-smooth">Features</a></li>
              <li><a href="/pricing" className="hover:text-primary transition-smooth">Pricing</a></li>
              <li><a href="/#testimonials" className="hover:text-primary transition-smooth">Reviews</a></li>
              <li><a href="/referrals" className="hover:text-primary transition-smooth">Referral Program</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/help" className="hover:text-primary transition-smooth">Help Center</a></li>
              <li><a href="/contact" className="hover:text-primary transition-smooth">Contact Us</a></li>
              <li><a href="/privacy" className="hover:text-primary transition-smooth">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-primary transition-smooth">Terms of Service</a></li>
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Connect</h3>
            <div className="flex space-x-4">
              <a 
                href="https://twitter.com/rizzchat" 
                className="text-muted-foreground hover:text-primary transition-smooth hover-lift"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://instagram.com/rizzchat" 
                className="text-muted-foreground hover:text-primary transition-smooth hover-lift"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="mailto:hello@rizzchat.com" 
                className="text-muted-foreground hover:text-primary transition-smooth hover-lift"
                aria-label="Send us an email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © 2024 RizzChat. All rights reserved.
          </p>

        </div>
      </div>
    </footer>
  );
};