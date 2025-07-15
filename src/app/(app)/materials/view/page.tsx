
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function PdfViewer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pdfUrl = searchParams.get('url');

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <p className="text-destructive font-semibold mb-4">Error: PDF URL not provided.</p>
        <Button onClick={() => router.push('/materials')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Materials
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
       <div className="flex-shrink-0 mb-4">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </div>
      <Card className="flex-grow">
        <CardContent className="p-0 h-full">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="PDF Viewer"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function MaterialViewPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <PdfViewer />
    </Suspense>
  );
}
