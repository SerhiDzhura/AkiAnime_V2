export const Badge = ({ text }: {text:string }) => {
  return (
    <>
       <button disabled className="px-2 py-1 bg-blue-800 rounded-lg">
        {text}
       </button>
    </>
  )  
}