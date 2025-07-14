
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
    uploadStudyMaterial, 
    Material, 
    getStudyMaterials, 
    deleteStudyMaterial,
    updateStudyMaterial,
    MaterialUpload,
    getCareerTip,
    updateCareerTip,
    CareerTip,
    createQuiz,
    deleteQuiz,
    getQuizzes,
    Quiz,
    Question,
    updateQuiz,
} from "@/services/firestore";
import { Loader2, PlusCircle, Trash2, Edit } from "lucide-react";
import { grades } from "@/config/grades";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const materialFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  grade: z.string({ required_error: "Please select a grade." }),
  subject: z.string().min(2, { message: "Subject must be at least 2 characters." }),
  type: z.enum(["notes", "video", "past-paper"], { required_error: "You need to select a material type." }),
  file: z.instanceof(File).optional(),
}).refine(data => {
    // If it's a new material (no id), a file is required.
    // If it's an existing material (has an id), a file is optional.
    if (!data.id) {
        return !!data.file;
    }
    return true;
}, {
    message: "File is required for new materials.",
    path: ["file"],
});

const careerTipFormSchema = z.object({
    text: z.string().min(10, "The tip must be at least 10 characters long."),
    author: z.string().min(2, "Author must be at least 2 characters long."),
});

const quizFormSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(3, "Title must be at least 3 characters."),
    grade: z.string({ required_error: "Please select a grade." }),
    subject: z.string().min(2, "Subject must be at least 2 characters."),
    questions: z.array(z.object({
        text: z.string().min(5, "Question text must be at least 5 characters."),
        options: z.array(z.object({
            text: z.string().min(1, "Option text cannot be empty."),
            isCorrect: z.boolean().default(false),
        })).min(2, "Each question must have at least 2 options.").refine(
            (options) => options.filter((opt) => opt.isCorrect).length === 1,
            { message: "Each question must have exactly one correct answer." }
        ),
    })).min(1, "A quiz must have at least one question."),
});

type MaterialFormValues = z.infer<typeof materialFormSchema>;
type CareerTipFormValues = z.infer<typeof careerTipFormSchema>;
type QuizFormValues = z.infer<typeof quizFormSchema>;

function MaterialForm({ material, onFinished }: { material?: Material, onFinished: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = !!material;

    const form = useForm<MaterialFormValues>({
        resolver: zodResolver(materialFormSchema),
        defaultValues: {
            id: material?.id || undefined,
            title: material?.title || "",
            description: material?.description || "",
            grade: material?.grade || "",
            subject: material?.subject || "",
            type: material?.type || undefined,
            file: undefined,
        },
    });

    async function onSubmit(values: MaterialFormValues) {
        setIsSubmitting(true);
        try {
            if (isEditMode && values.id) {
                const { file, ...updateValues } = values;
                const finalValues: Partial<MaterialUpload & {id: string}> = updateValues;
                if (file) {
                    (finalValues as any).file = file;
                }
                await updateStudyMaterial(values.id, finalValues);
                toast({ title: "Success!", description: "The study material has been updated." });
            } else {
                const { id, ...uploadValues } = values;
                if (!uploadValues.file) {
                     toast({ title: "Upload Failed", description: "A file is required to upload new material.", variant: "destructive" });
                     setIsSubmitting(false);
                     return;
                }
                await uploadStudyMaterial(uploadValues as Omit<MaterialUpload, 'id'>);
                toast({ title: "Success!", description: "The study material has been uploaded." });
            }
            form.reset();
            onFinished();
        } catch (error) {
            console.error("Operation failed", error);
            toast({ title: "Operation Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input placeholder="e.g., Introduction to Calculus" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea placeholder="A brief overview of the study material." className="resize-none" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FormField control={form.control} name="grade" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Grade</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a grade" /></SelectTrigger></FormControl>
                                <SelectContent>{grades.map(grade => <SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="subject" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl><Input placeholder="e.g., Combined Maths" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="notes">Notes/PDF</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="past-paper">Past Paper</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="file" render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                        <FormLabel>File</FormLabel>
                        <FormControl><Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl>
                        <FormDescription>{isEditMode ? "Upload a new file to replace the existing one. Leave empty to keep the current file." : "Upload the PDF, video file, or document."}</FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? 'Update Material' : 'Upload Material'}
                </Button>
            </form>
        </Form>
    );
}

function ManageMaterials() {
    const { toast } = useToast();
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [items, setItems] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Material | undefined>(undefined);

    const fetchItems = (grade: string) => {
        setLoading(true);
        getStudyMaterials(grade, false).then(fetchedItems => {
            setItems(fetchedItems);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        if (selectedGrade) {
            fetchItems(selectedGrade);
        } else {
            setItems([]);
        }
    }, [selectedGrade]);

    const handleDelete = async (id: string) => {
        setIsSubmitting(true);
        try {
            await deleteStudyMaterial(id);
            setItems(items.filter(item => item.id !== id));
            toast({ title: 'Success', description: `Material deleted successfully.` });
        } catch (error) {
            toast({ title: 'Error', description: `Failed to delete material.`, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleEdit = (item: Material) => {
        setCurrentItem(item);
        setEditDialogOpen(true);
    };

    const onEditFinished = () => {
        setEditDialogOpen(false);
        setCurrentItem(undefined);
        if (selectedGrade) {
            fetchItems(selectedGrade);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Manage Materials</CardTitle>
                    <CardDescription>Select a grade to view, edit, or delete existing materials.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="max-w-xs">
                        <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                            <SelectTrigger><SelectValue placeholder="Select a grade to manage" /></SelectTrigger>
                            <SelectContent>{grades.map(grade => (<SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                    {loading ? <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        : items.length > 0 ? (
                            <div className="border rounded-md">
                                {items.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 md:p-4 border-b last:border-b-0 flex-wrap">
                                        <div className="flex-1 min-w-[150px] mb-2 md:mb-0">
                                            <p className="font-semibold">{item.title}</p>
                                            <p className="text-sm text-muted-foreground">{item.subject}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="h-4 w-4" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={isSubmitting}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the material.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(item.id)} disabled={isSubmitting}>
                                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : selectedGrade && <p className="text-muted-foreground text-center py-4">No materials found for this grade.</p>
                    }
                </CardContent>
            </Card>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Material</DialogTitle>
                        <DialogDescription>
                            Make changes to your material here. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    {currentItem && <MaterialForm material={currentItem} onFinished={onEditFinished} />}
                </DialogContent>
            </Dialog>
        </>
    );
}

function CareerTipForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm<CareerTipFormValues>({
        resolver: zodResolver(careerTipFormSchema),
        defaultValues: {
            text: "",
            author: "",
        },
    });

    useEffect(() => {
        getCareerTip().then(tip => {
            if (tip) {
                form.reset(tip);
            }
        });
    }, [form]);

    async function onSubmit(values: CareerTipFormValues) {
        setIsLoading(true);
        try {
            await updateCareerTip(values);
            toast({ title: "Success!", description: "The career tip has been updated." });
        } catch (error) {
            console.error("Failed to update career tip", error);
            toast({ title: "Error", description: "Could not update the career tip.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Career Tip of the Day</CardTitle>
                <CardDescription>Update the career tip that appears on the student dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="text"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tip Text</FormLabel>
                                    <FormControl>
                                        <Textarea rows={4} placeholder="Enter the career tip..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="author"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Author</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Abraham Lincoln" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Tip
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

function QuizForm({ quiz, onFinished }: { quiz?: Quiz, onFinished: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = !!quiz;

    const form = useForm<QuizFormValues>({
        resolver: zodResolver(quizFormSchema),
        defaultValues: {
            id: quiz?.id,
            title: quiz?.title || "",
            grade: quiz?.grade || "",
            subject: quiz?.subject || "",
            questions: quiz?.questions || [{ text: "", options: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }],
        },
    });

    const { fields: questions, append: appendQuestion, remove: removeQuestion } = useFieldArray({
        control: form.control,
        name: "questions",
    });

    async function onSubmit(values: QuizFormValues) {
        setIsSubmitting(true);
        try {
            const quizData: Omit<Quiz, 'id' | 'createdAt'> = {
                title: values.title,
                grade: values.grade,
                subject: values.subject,
                questions: values.questions,
            };

            if (isEditMode && values.id) {
                await updateQuiz(values.id, quizData);
                toast({ title: "Success!", description: "The quiz has been updated." });
            } else {
                await createQuiz(quizData);
                toast({ title: "Success!", description: "The quiz has been created." });
            }
            form.reset();
            onFinished();
        } catch (error) {
            console.error("Quiz operation failed", error);
            toast({ title: "Operation Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Quiz Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="grade" render={({ field }) => (
                        <FormItem><FormLabel>Grade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a grade" /></SelectTrigger></FormControl><SelectContent>{grades.map(grade => <SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="subject" render={({ field }) => (
                        <FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="e.g., Physics" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Questions</h3>
                    {questions.map((question, qIndex) => (
                        <Card key={question.id} className="p-4 bg-secondary/50">
                            <div className="flex justify-between items-center mb-2">
                                <FormLabel>Question {qIndex + 1}</FormLabel>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                            <FormField control={form.control} name={`questions.${qIndex}.text`} render={({ field }) => (
                                <FormItem><FormControl><Textarea {...field} placeholder="Enter the question text" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <OptionsArray qIndex={qIndex} form={form} />
                        </Card>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendQuestion({ text: "", options: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                    </Button>
                </div>
                <div className="flex justify-end gap-2">
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? 'Update Quiz' : 'Create Quiz'}
                    </Button>
                </div>
            </form>
        </Form>
    )
}

function OptionsArray({ qIndex, form }: { qIndex: number; form: any }) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: `questions.${qIndex}.options`
    });
    
    const handleCheckboxChange = (optionIndex: number) => {
        const options = form.getValues(`questions.${qIndex}.options`);
        const updatedOptions = options.map((opt: any, idx: number) => ({
            ...opt,
            isCorrect: idx === optionIndex
        }));
        form.setValue(`questions.${qIndex}.options`, updatedOptions, { shouldValidate: true });
    };

    return (
        <div className="mt-4 space-y-2">
            <FormLabel>Options</FormLabel>
            {fields.map((option, oIndex) => (
                <div key={option.id} className="flex items-center gap-2">
                    <FormField control={form.control} name={`questions.${qIndex}.options.${oIndex}.isCorrect`} render={({ field }) => (
                        <FormItem className="flex items-center">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={() => handleCheckboxChange(oIndex)} /></FormControl>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name={`questions.${qIndex}.options.${oIndex}.text`} render={({ field }) => (
                        <FormItem className="flex-grow"><FormControl><Input {...field} placeholder={`Option ${oIndex + 1}`} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(oIndex)}><Trash2 className="h-4 w-4 text-destructive/70" /></Button>
                </div>
            ))}
            <Button type="button" variant="link" size="sm" onClick={() => append({ text: "", isCorrect: false })}>Add Option</Button>
            <FormMessage>{form.formState.errors.questions?.[qIndex]?.options?.root?.message}</FormMessage>
        </div>
    );
}

function ManageQuizzes() {
    const { toast } = useToast();
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentQuiz, setCurrentQuiz] = useState<Quiz | undefined>(undefined);

    const fetchQuizzes = (grade: string) => {
        setLoading(true);
        getQuizzes(grade).then(setQuizzes).finally(() => setLoading(false));
    };

    useEffect(() => {
        if (selectedGrade) {
            fetchQuizzes(selectedGrade);
        } else {
            setQuizzes([]);
        }
    }, [selectedGrade]);

    const handleDelete = async (id: string) => {
        setIsSubmitting(true);
        try {
            await deleteQuiz(id);
            setQuizzes(quizzes.filter(q => q.id !== id));
            toast({ title: 'Success', description: 'Quiz deleted successfully.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete quiz.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (quiz: Quiz) => {
        setCurrentQuiz(quiz);
        setDialogOpen(true);
    };
    
    const onFormFinished = () => {
        setDialogOpen(false);
        setCurrentQuiz(undefined);
        if (selectedGrade) {
            fetchQuizzes(selectedGrade);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Manage Quizzes</CardTitle>
                    <CardDescription>Select a grade to view, edit, or delete existing quizzes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="max-w-xs">
                        <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                            <SelectTrigger><SelectValue placeholder="Select a grade to manage" /></SelectTrigger>
                            <SelectContent>{grades.map(grade => (<SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                     {loading ? <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        : quizzes.length > 0 ? (
                            <div className="border rounded-md">
                                {quizzes.map(quiz => (
                                    <div key={quiz.id} className="flex items-center justify-between p-3 md:p-4 border-b last:border-b-0 flex-wrap">
                                        <div className="flex-1 min-w-[150px] mb-2 md:mb-0">
                                            <p className="font-semibold">{quiz.title}</p>
                                            <p className="text-sm text-muted-foreground">{quiz.subject} - {quiz.questions.length} questions</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(quiz)}><Edit className="h-4 w-4" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={isSubmitting}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone and will permanently delete this quiz.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(quiz.id)} disabled={isSubmitting}>
                                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : selectedGrade && <p className="text-muted-foreground text-center py-4">No quizzes found for this grade.</p>
                    }
                </CardContent>
            </Card>

             <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{currentQuiz ? 'Edit Quiz' : 'Create Quiz'}</DialogTitle>
                        <DialogDescription>
                           {currentQuiz ? 'Make changes to your quiz.' : 'Create a new quiz for students.'}
                        </DialogDescription>
                    </DialogHeader>
                    <QuizForm quiz={currentQuiz} onFinished={onFormFinished} />
                </DialogContent>
            </Dialog>
        </>
    );
}


export default function AdminPage() {
    const [materialFormOpen, setMaterialFormOpen] = useState(false);
    const [quizFormOpen, setQuizFormOpen] = useState(false);

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline">Admin Panel</h1>
            <p className="text-muted-foreground">Manage your educational content.</p>
        </div>
        <Tabs defaultValue="materials" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="materials">Study Materials</TabsTrigger>
                <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
                <TabsTrigger value="settings">General Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="materials" className="space-y-4">
                 <Dialog open={materialFormOpen} onOpenChange={setMaterialFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Upload New Material
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Upload New Study Material</DialogTitle>
                            <DialogDescription>
                                Fill out the form below to add a new study material to the library.
                            </DialogDescription>
                        </DialogHeader>
                         <MaterialForm onFinished={() => setMaterialFormOpen(false)} />
                    </DialogContent>
                </Dialog>
                <ManageMaterials />
            </TabsContent>
            <TabsContent value="quizzes" className="space-y-4">
                <Dialog open={quizFormOpen} onOpenChange={setQuizFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create New Quiz
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Quiz</DialogTitle>
                            <DialogDescription>
                                Build a new quiz with questions and answers.
                            </DialogDescription>
                        </DialogHeader>
                        <QuizForm onFinished={() => setQuizFormOpen(false)} />
                    </DialogContent>
                </Dialog>
                <ManageQuizzes />
            </TabsContent>
            <TabsContent value="settings" className="space-y-4">
                <CareerTipForm />
            </TabsContent>
        </Tabs>
    </div>
  );
}
