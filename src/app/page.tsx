
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, UserCheck, Languages } from 'lucide-react';
import { Logo } from '@/components/icons';

const features = [
  {
    icon: <UserCheck className="w-8 h-8 text-primary" />,
    title: 'Personalized Dashboard',
    description: 'Your learning journey, customized for you. Track progress and see daily plans.',
  },
  {
    icon: <BookOpen className="w-8 h-8 text-primary" />,
    title: 'Rich Study Materials',
    description: 'Access a vast library of study materials for all your subjects, organized by grade and topic.',
  },
  {
    icon: <Languages className="w-8 h-8 text-primary" />,
    title: 'Multilingual Support',
    description: 'Learn in the language you are most comfortable with: English, Sinhala, or Tamil.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold font-headline text-foreground">SmartStudy Village</span>
        </Link>
        <nav className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/signup">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-grow">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-20 md:py-32">
          <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight">
            Unlock Your Potential.
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground font-body">
            Welcome to SmartStudy Village, a new way of learning designed for the bright minds of Sri Lanka. Your personalized educational journey starts here.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/signup">Start Learning Now</Link>
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </section>

        <section id="features" className="bg-secondary py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold font-headline">A Complete Learning Ecosystem</h2>
              <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
                Everything you need to succeed, all in one place.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="text-center bg-background shadow-lg border-2 border-transparent hover:border-primary transition-all duration-300">
                  <CardHeader>
                    <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-primary/10 mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SmartStudy Village. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
