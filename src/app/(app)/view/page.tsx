
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function getYoutubeEmbedUrl(url: string) {
    let videoId;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
        }
    } catch (e) {
        // Fallback for invalid URLs
        return null;
    }

    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
    }
    return null;
}

function getPdfEmbedUrl(url: string) {
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
}


function MediaViewer() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const type = searchParams.get('type');
    const url = searchParams.get('url');
    const title = searchParams.get('title');

    if (!type || !url) {
        return <div className="text-center py-10 text-destructive">Missing media information.</div>;
    }

    let embedUrl: string | null = null;
    let isVideo = false;
    if (type === 'video') {
        embedUrl = getYoutubeEmbedUrl(url);
        isVideo = true;
    } else if (type === 'notes' || type === 'past-paper') {
        embedUrl = getPdfEmbedUrl(url);
    }

    return (
        <div className="flex flex-col h-full">
             <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-bold font-headline truncate">{title || 'Media Viewer'}</h1>
            </div>
            {embedUrl ? (
                <div className={cn("relative w-full", isVideo ? "aspect-video" : "flex-grow")}>
                    <iframe
                        src={embedUrl}
                        className="absolute top-0 left-0 w-full h-full border-0 rounded-lg shadow-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={title || 'Embedded Media'}
                    ></iframe>
                </div>
            ) : (
                <div className="text-center py-10 text-destructive">Could not load the media. The URL might be invalid.</div>
            )}
        </div>
    );
}

export default function ViewPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <MediaViewer />
        </Suspense>
    )
}
