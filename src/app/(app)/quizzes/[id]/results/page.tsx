
import { QuizResults } from './QuizResults';

export async function generateStaticParams() {
    // Return an empty array.
    // This tells Next.js not to pre-render any specific result pages at build time.
    // The pages will be rendered on the client-side.
    return [];
}

export default function QuizResultsPage() {
    return <QuizResults />;
}
