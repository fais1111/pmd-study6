
import { TakeQuizPlayer } from './TakeQuizPlayer';

export async function generateStaticParams() {
    // Return an empty array.
    // This tells Next.js not to pre-render any specific quiz pages at build time.
    // The pages will be rendered on the client-side when a user navigates to them.
    return [];
}

export default function TakeQuizPage() {
    return <TakeQuizPlayer />;
}
