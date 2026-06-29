export default function ExperiencesLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-64 bg-ivory-200 rounded-lg" />
      <div className="h-32 bg-ivory-200 rounded-xl" />
      <div className="grid md:grid-cols-2 gap-3">
        <div className="h-40 bg-ivory-200 rounded-xl" />
        <div className="h-40 bg-ivory-200 rounded-xl" />
      </div>
    </div>
  );
}
