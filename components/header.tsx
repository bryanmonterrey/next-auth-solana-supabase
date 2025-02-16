import { MainNav } from "./main-nav"
import UserButton from "./user-button"
import WalletConnectButton from "./wallet/walletConnectButton";
import { SignIn, SignOut } from "./auth-components"
import { Button } from "./ui/button"

export default function Header() {
  return (
    <header className="sticky flex justify-center border-b">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
        <MainNav />
        <WalletConnectButton />
        <UserButton />
      </div>
    </header>
  )
}
