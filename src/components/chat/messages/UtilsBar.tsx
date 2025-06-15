import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckIcon, CopyIcon, GitBranchIcon, MoreHorizontalIcon, PencilIcon, RefreshCcwIcon, TrashIcon } from "lucide-react";

export const AIToolUtilsBar = ({ isDropdownOpen, setIsDropdownOpen, handleCopyText, copied }: { isDropdownOpen: boolean, setIsDropdownOpen: (open: boolean) => void, handleCopyText: () => void, copied: boolean }) => {
  return (
    <div
      className={`flex flex-row items-center justify-start ${
        isDropdownOpen
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100"
      } transition-opacity duration-100 gap-1`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopyText}
        className={copied ? "text-green-500" : ""}
      >
        {copied ? (
          <CheckIcon className="w-4 h-4" />
        ) : (
          <CopyIcon className="w-4 h-4" />
        )}
      </Button>

      <Button variant="ghost" size="icon">
        <GitBranchIcon className="w-4 h-4" />
      </Button>

      <Button variant="ghost" size="icon">
        <RefreshCcwIcon className="w-4 h-4" />
      </Button>

      <DropdownMenu onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontalIcon className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem>
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit message
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem className="text-destructive">
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete message
          </DropdownMenuItem>

          <DropdownMenuItem className="text-destructive">
            <img src="/cascade-del.svg" className="w-4 h-4 mr-2" />
            Delete Cascading
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const UserUtilsBar = ({ isDropdownOpen, setIsDropdownOpen, handleCopyText, copied }: { isDropdownOpen: boolean, setIsDropdownOpen: (open: boolean) => void, handleCopyText: () => void, copied: boolean }) => {
  return (
    <div
      className={`flex flex-row items-center justify-start ${
        isDropdownOpen
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100"
      } transition-opacity duration-100 gap-1`}
    >
      <Button variant="ghost" size="icon">
        <RefreshCcwIcon className="w-4 h-4" />
      </Button>

      <Button variant="ghost" size="icon">
        <PencilIcon className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopyText}
        className={copied ? "text-green-500" : ""}
      >
        {copied ? (
          <CheckIcon className="w-4 h-4" />
        ) : (
          <CopyIcon className="w-4 h-4" />
        )}
      </Button>

      <DropdownMenu onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontalIcon className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem className="text-destructive">
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete message
          </DropdownMenuItem>

          <DropdownMenuItem className="text-destructive">
            <img src="/cascade-del.svg" className="w-4 h-4 mr-2" />
            Delete Cascading
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};