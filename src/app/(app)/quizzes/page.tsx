
import QuizzesList from "./QuizzesList";

export default function QuizzesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold font-headline">Quizzes</h1>
                <p className="text-muted-foreground">Test your knowledge and prepare for exams.</p>
            </div>
            <QuizzesList />
        </div>
    );
}
