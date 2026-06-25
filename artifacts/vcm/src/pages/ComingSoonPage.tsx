interface Props {
  title: string;
  description?: string;
}

export default function ComingSoonPage({ title, description }: Props) {
  return (
    <div className="max-w-2xl mx-auto px-3 py-16 text-center" data-testid="coming-soon-page">
      <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
        <img src="/vcm-logo.png" alt="VCM" className="h-20 w-auto object-contain" />
      </div>
      <h1 className="text-2xl font-extrabold text-foreground mb-2" data-testid="coming-soon-title">
        {title}
      </h1>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto" data-testid="coming-soon-description">
        {description ?? "This feature is coming soon. Stay tuned — big things are happening at Vawulence City Media."}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-full px-4 py-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        <span className="text-sm text-primary font-medium">Coming Soon</span>
      </div>
    </div>
  );
}
