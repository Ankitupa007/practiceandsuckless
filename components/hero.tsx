export default function Header() {
  return (
    <div className="flex flex-col gap-16 items-center py-8">
      <h1 className="uppercase"><span className="text-red-600">XX</span> days practice & suck less</h1>
      <p className="text-3xl uppercase lg:text-4xl !leading-tight mx-auto max-w-xl text-center">
       A consistent way to practice any skill
      </p>
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
    </div>
  );
}
