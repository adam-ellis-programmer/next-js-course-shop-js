import { ThemeProvider } from './theme-provider'
// Under the hood, next-themes uses React's Context API to make theme information and functions available throughout your component tree: 
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
    >
      {children}  
    </ThemeProvider>
  )
}
export default Providers
 
