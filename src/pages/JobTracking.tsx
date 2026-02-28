import { Briefcase, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const JobTracking = () => {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-secondary" />
          Job Tracking
        </h1>
        <p className="mt-2 text-muted-foreground">
          Track your job applications, deadlines, and progress all in one place.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Applications</CardTitle>
          <CardDescription>No applications tracked yet. Add your first one to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            <Plus className="h-4 w-4" /> Add Application
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobTracking;
