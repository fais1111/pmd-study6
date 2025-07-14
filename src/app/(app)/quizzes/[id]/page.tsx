
import { TakeQuizPlayer } from './TakeQuizPlayer';

export async function generateStaticParams() {
    // Return an empty array to indicate that all quiz pages are dynamically generated on the client.
    // This satisfies the requirement for static export with dynamic routes.
    return [];
}

export default function TakeQuizPage() {
    return <TakeQuizPlayer />;
}
