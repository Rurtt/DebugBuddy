export const runCPlusPlus = async (code: string) => {
  const response = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compiler: "gcc-head",
      code: code,
      save: true,
    }),
  });
  return await response.json();
};