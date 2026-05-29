import { motion } from "framer-motion";
import { CheckCircle2, ListTodo, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <CheckCircle2 className="text-primary-foreground w-6 h-6" />
          </div>
          <span className="text-2xl font-display font-bold tracking-tight">Zen-Do</span>
        </div>
        <div className="flex gap-4">
          <Link to="/login">
            <Button variant="ghost" className="hover:bg-accent transition-spring">Login</Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-primary text-primary-foreground shadow-elegant hover:scale-105 transition-spring">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-6xl md:text-8xl font-display font-bold leading-tight mb-8">
              Focus on what <br />
              <span className="italic text-primary">really matters.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 font-light leading-relaxed">
              Experience the most serene way to manage your daily tasks. 
              Minimalism meets powerful organization.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/signup">
                <Button size="lg" className="h-14 px-10 text-lg rounded-2xl bg-primary shadow-elegant hover:scale-105 transition-spring">
                  Build your list
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-10 text-lg rounded-2xl border-2 hover:bg-accent transition-spring">
                Learn how it works
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-12 mt-40">
          {[
            { icon: ListTodo, title: "Pure Focus", desc: "Clutter-free interface designed to keep you in the flow state." },
            { icon: ShieldCheck, title: "Secure Sync", desc: "Your data is encrypted and synced across all your devices." },
            { icon: Zap, title: "Instant Action", desc: "Keyboard-first design for lightning fast task management." }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="p-8 rounded-3xl bg-card border border-border/50 hover:shadow-elegant transition-spring group"
            >
              <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-spring">
                <feature.icon className="text-primary w-6 h-6" />
              </div>
              <h3 className="text-2xl font-display font-bold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-light">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Landing;
