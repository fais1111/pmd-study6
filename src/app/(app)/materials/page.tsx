
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, FileText, PlayCircle, Loader2, Search } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useMemo, memo } from "react";
import { getStudyMaterials, Material } from "@/services/firestore";
import { useAuth } from "@/context/AuthContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

const MaterialCard = memo(function MaterialCard({ material }: { material: Material }) {
    const isVideo = material.type === 'video';
    const icon = isVideo ? <PlayCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
    const typeText = isVideo ? 'Video Lesson' : (material.type === 'notes' ? 'Chapter Notes' : 'Past Paper');
    const imageHint = `${material.subject} ${material.type}`;

    const href = isVideo ? material.fileUrl : `/materials/view?url=${encodeURIComponent(material.fileUrl)}`;
    const target = isVideo ? "_blank" : "_self";

    return (
        <Card className="shadow-sm overflow-hidden flex flex-col group">
            <CardHeader className="p-0">
                <div className="relative h-48 w-full">
                    <Image src="https://placehold.co/600x400.png" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" style={{objectFit:"cover"}} alt={material.title} data-ai-hint={imageHint} className="transition-transform duration-300 group-hover:scale-105" />
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
                <CardTitle className="font-headline text-lg mb-2">{material.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {icon}
                    <span>{typeText}</span>
                </div>
            </CardContent>
            <CardFooter className="p-4 bg-secondary/50">
                <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href={href} target={target} rel={isVideo ? "noopener noreferrer" : ""}>
                        {isVideo ? 'Watch Video' : 'View Material'} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
});

type GroupedMaterials = {
    [subject: string]: {
        notes: Material[];
        video: Material[];
        'past-paper': Material[];
    }
}

function MaterialsList() {
    const { userProfile, loading: authLoading } = useAuth();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});

    const grade = userProfile?.grade;

    useEffect(() => {
        if (authLoading) {
            setLoading(true);
            return;
        }

        async function fetchMaterials() {
            if (!grade) {
                setLoading(false);
                return;
            };

            try {
                setLoading(true);
                const fetchedMaterials = await getStudyMaterials(grade, true);
                setMaterials(fetchedMaterials);
                setError(null);
            } catch (err) {
                console.error(`Failed to fetch materials for ${grade}:`, err);
                setError("Could not load materials. Please try again later.");
            } finally {
                setLoading(false);
            }
        }
        fetchMaterials();
    }, [grade, authLoading]);

    const groupedMaterials = useMemo(() => {
        return materials.reduce((acc, material) => {
            const subject = material.subject;
            if (!acc[subject]) {
                acc[subject] = { notes: [], video: [], 'past-paper': [] };
            }
            if (material.type === 'notes' || material.type === 'video' || material.type === 'past-paper') {
               acc[subject][material.type].push(material);
            }
            return acc;
        }, {} as GroupedMaterials);
    }, [materials]);
    
    const filteredSubjects = useMemo(() => {
        if (!searchQuery) return Object.keys(groupedMaterials);
        return Object.keys(groupedMaterials).filter(subject => 
            subject.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, groupedMaterials]);

    const handleTabChange = (subject: string, value: string) => {
        setActiveTabs(prev => ({ ...prev, [subject]: value }));
    };

    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return <div className="text-center text-destructive py-10">{error}</div>
    }
    
    if (!grade) {
         return <div className="text-center text-muted-foreground py-10">Please complete your profile to see materials.</div>
    }

    if (materials.length === 0) {
        return <div className="text-center text-muted-foreground py-10">No study materials found for your grade.</div>
    }

    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Search by subject..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            {filteredSubjects.length > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-4">
                    {filteredSubjects.map(subject => {
                         const { notes, video, 'past-paper': pastPapers } = groupedMaterials[subject];
                         const totalCount = notes.length + video.length + pastPapers.length;
                         const defaultTab = notes.length > 0 ? 'notes' : video.length > 0 ? 'video' : 'past-paper';
                         const activeTab = activeTabs[subject] || defaultTab;

                         return (
                            <AccordionItem value={subject} key={subject} className="border-0">
                               <Card className="shadow-sm">
                                    <AccordionTrigger className="p-4 md:p-6 text-lg font-headline hover:no-underline">
                                        <div className="flex items-center gap-4">
                                            <span>{subject}</span>
                                            <Badge variant="secondary">{totalCount} items</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 md:p-6 pt-0">
                                         <Tabs defaultValue={defaultTab} onValueChange={(value) => handleTabChange(subject, value)} className="w-full">
                                            <TabsList>
                                                {notes.length > 0 && <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>}
                                                {video.length > 0 && <TabsTrigger value="video">Videos ({video.length})</TabsTrigger>}
                                                {pastPapers.length > 0 && <TabsTrigger value="past-paper">Past Papers ({pastPapers.length})</TabsTrigger>}
                                            </TabsList>
                                            <TabsContent value="notes" className="pt-4">
                                                {activeTab === 'notes' && (
                                                    <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                        {notes.map(material => <MaterialCard key={material.id} material={material} />)}
                                                    </div>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="video" className="pt-4">
                                                {activeTab === 'video' && (
                                                     <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                        {video.map(material => <MaterialCard key={material.id} material={material} />)}
                                                    </div>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="past-paper" className="pt-4">
                                                {activeTab === 'past-paper' && (
                                                    <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                        {pastPapers.map(material => <MaterialCard key={material.id} material={material} />)}
                                                    </div>
                                                )}
                                            </TabsContent>
                                        </Tabs>
                                    </AccordionContent>
                               </Card>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            ) : (
                <div className="text-center text-muted-foreground py-10">No subjects found matching your search.</div>
            )}
        </div>
    );
}

export default function MaterialsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold font-headline">Study Materials</h1>
                <p className="text-muted-foreground">Find all the materials for your grade, organized by subject.</p>
            </div>
            <MaterialsList />
        </div>
    )
}

    
