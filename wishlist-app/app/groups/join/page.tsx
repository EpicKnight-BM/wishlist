import JoinGroupForm from "./JoinGroupForm";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function JoinGroupPage({ searchParams }: Props) {
  const { code } = await searchParams;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Join a Group</h1>
      <JoinGroupForm initialCode={code?.trim() ?? ""} />
    </div>
  );
}
