import { Mic, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MockInterviews = () => {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Mic className="h-8 w-8 text-primary" />
          Mock Interviews
        </h1>
        <p className="mt-2 text-muted-foreground">
          Practice interviews with AI-powered feedback on your responses.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Start a Practice Session</CardTitle>
          <CardDescription>Choose a role and get tailored interview questions with real-time feedback.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="gap-2">
            Begin Interview <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockInterviews;
