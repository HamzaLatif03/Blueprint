const Dashboard = () => {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Welcome to Blueprint</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Your career toolkit — practice interviews, explore postgrad programmes, and track applications.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Mock Interviews", desc: "Practice with AI feedback", color: "bg-primary/10 text-primary", href: "/mock-interviews" },
          { title: "Postgrad", desc: "Find PhD & Masters matches", color: "bg-accent/10 text-accent", href: "/postgrad" },
          { title: "Job Tracking", desc: "Track your applications", color: "bg-secondary/10 text-secondary", href: "/job-tracking" },
        ].map((item) => (
          <a
            key={item.title}
            href={item.href}
            className={`rounded-xl p-6 ${item.color} hover:opacity-80 transition-opacity`}
          >
            <h3 className="font-semibold text-lg">{item.title}</h3>
            <p className="text-sm opacity-75 mt-1">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
