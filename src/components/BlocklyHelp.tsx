"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Blockly from "blockly";
import { blockHelp } from "@/blocks/blockHelp";
import { Button } from "@/components/ui/button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type AnchorPosition = {
  x: number;
  y: number;
};

const HELP_TITLE_ID = "codely-block-help-title";

export function BlocklyHelp({
  workspace,
}: {
  workspace: Blockly.WorkspaceSvg | null;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedBlock, setSelectedBlock] = useState<Blockly.Block | null>(
    null,
  );

  const [helpOpen, setHelpOpen] = useState(false);

  const [anchorPosition, setAnchorPosition] = useState<AnchorPosition>({
    x: 0,
    y: 0,
  });

  const updateAnchorPosition = useCallback((block: Blockly.Block) => {
    const blockElement = (block as Blockly.BlockSvg).getSvgRoot();

    if (!blockElement || !editorRef.current) return;

    const blockRect = blockElement.getBoundingClientRect();

    const editorRect = editorRef.current.getBoundingClientRect();

    const nextPosition = {
      x: blockRect.right - editorRect.left + 8,
      y: blockRect.top - editorRect.top,
    };

    setAnchorPosition((currentPosition) =>
      currentPosition.x === nextPosition.x &&
      currentPosition.y === nextPosition.y
        ? currentPosition
        : nextPosition,
    );
  }, []);

  useEffect(() => {
    if (!workspace) return;

    const listener = (event: Blockly.Events.Abstract) => {
      if (event.type === Blockly.Events.CLICK) {
        const clickEvent = event as Blockly.Events.Click;
        if (!clickEvent.blockId) return;

        const block = workspace.getBlockById(clickEvent.blockId);
        if (!block) return;
        setSelectedBlock(block);
        setHelpOpen(true);
        updateAnchorPosition(block);
        return;
      }

      if (
        !selectedBlock ||
        (event.type !== Blockly.Events.VIEWPORT_CHANGE &&
          event.type !== Blockly.Events.BLOCK_MOVE)
      ) {
        return;
      }

      const block = workspace.getBlockById(selectedBlock.id);
      if (block) updateAnchorPosition(block);
    };

    workspace.addChangeListener(listener);

    const handleResize = () => {
      const block = selectedBlock && workspace.getBlockById(selectedBlock.id);
      if (block) updateAnchorPosition(block);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      workspace.removeChangeListener(listener);
      window.removeEventListener("resize", handleResize);
    };
  }, [workspace, selectedBlock, updateAnchorPosition]);

  useEffect(() => {
    if (!workspace || !selectedBlock || !helpOpen) return;

    let animationFrame: number;

    const trackBlockPosition = () => {
      const block = workspace.getBlockById(selectedBlock.id);
      if (block) updateAnchorPosition(block);
      animationFrame = window.requestAnimationFrame(trackBlockPosition);
    };

    animationFrame = window.requestAnimationFrame(trackBlockPosition);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [workspace, selectedBlock, helpOpen, updateAnchorPosition]);

  return (
    <div ref={editorRef} className="pointer-events-none absolute inset-0 z-100">
      <Popover open={helpOpen} onOpenChange={setHelpOpen}>
        <PopoverTrigger
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0"
          tabIndex={-1}
          style={{
            left: anchorPosition.x,
            top: anchorPosition.y,
          }}
        />

        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-80"
        >
          {selectedBlock && <BlockHelpContent block={selectedBlock} />}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function BlockHelpContent({ block }: { block: Blockly.Block }) {
  const help = blockHelp[block.type];

  return (
    <div className="space-y-2">
      <h3 id={HELP_TITLE_ID} tabIndex={-1} className="font-semibold">
        {help?.title ?? block.type}
      </h3>
      {help && (
        <div className="space-y-2">
          <div className="rounded-md bg-muted p-3 text-sm">
            {help.simpleExplanation}
          </div>
          {help.example && (
            <p className="text-sm">
              <strong>Example:</strong> {help.example}
            </p>
          )}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">
              More technical description
            </summary>
            <p className="mt-1">{help.description}</p>
          </details>
        </div>
      )}
      {!help && (
        <p className="text-sm text-muted-foreground">
          This block does not have a description yet. Try dragging it to see what it does.
        </p>
      )}
    </div>
  );
}
