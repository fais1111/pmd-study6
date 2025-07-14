
import { TakeQuizPlayer } from './TakeQuizPlayer';

export async function generateStaticParams() {
    return [];
}

export default function TakeQuizPage() {
    return <TakeQuizPlayer />;
}
