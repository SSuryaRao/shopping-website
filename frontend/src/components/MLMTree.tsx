'use client';

import { useState } from 'react';
import { Users, ChevronDown, ChevronRight, DollarSign, Mail, Hash } from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  email: string;
  referralCode?: string;
  totalEarnings: number;
  left: TreeNode | null;
  right: TreeNode | null;
  hasChildren: boolean;
}

interface MLMTreeProps {
  treeData: TreeNode;
}

interface TreeNodeProps {
  node: TreeNode;
  position?: 'left' | 'right' | 'root';
  onNodeClick: (node: TreeNode) => void;
}

const TreeNodeComponent = ({ node, position = 'root', onNodeClick }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = node.left || node.right;
  const positionColors = {
    root: 'from-purple-500 to-purple-600',
    left: 'from-blue-500 to-blue-600',
    right: 'from-green-500 to-green-600',
  };

  const positionBorders = {
    root: 'border-purple-300',
    left: 'border-blue-300',
    right: 'border-green-300',
  };

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div className="flex flex-col items-center">
        <div
          className={`relative bg-white rounded-xl shadow-lg border-2 ${positionBorders[position]} p-4 min-w-[220px] cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 group`}
          onClick={() => onNodeClick(node)}
        >
          {/* Position Badge */}
          {position !== 'root' && (
            <div className={`absolute -top-2 -right-2 bg-gradient-to-r ${positionColors[position]} text-white text-xs font-bold px-3 py-1 rounded-full shadow-md`}>
              {position.toUpperCase()}
            </div>
          )}

          {/* User Avatar */}
          <div className={`flex items-center justify-center w-14 h-14 bg-gradient-to-r ${positionColors[position]} rounded-full mx-auto mb-3 shadow-md`}>
            <span className="text-white text-xl font-bold">{node.name.charAt(0).toUpperCase()}</span>
          </div>

          {/* User Info */}
          <div className="text-center">
            <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{node.name}</h3>
            <p className="text-xs text-gray-500 mb-2 truncate">{node.email}</p>

            {/* Earnings Badge */}
            <div className="flex items-center justify-center bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg py-1.5 px-2 mb-2">
              <DollarSign className="w-3 h-3 text-yellow-600 mr-1" />
              <span className="text-xs font-semibold text-yellow-800">₹{node.totalEarnings.toFixed(2)}</span>
            </div>

            {/* Children Indicator */}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="flex items-center justify-center w-full mt-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4 mr-1" />
                    <span>Expand ({(node.left ? 1 : 0) + (node.right ? 1 : 0)})</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Hover Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl" />
        </div>

        {/* Connection Lines */}
        {hasChildren && isExpanded && (
          <div className="relative w-px h-8 bg-gradient-to-b from-gray-300 to-transparent" />
        )}
      </div>

      {/* Children Container */}
      {hasChildren && isExpanded && (
        <div className="flex items-start justify-center gap-8 mt-4 relative">
          {/* Horizontal Line */}
          {node.left && node.right && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-px bg-gray-300 max-w-md" />
          )}

          {/* Left Child */}
          {node.left && (
            <div className="flex flex-col items-center">
              <div className="w-px h-8 bg-gradient-to-b from-gray-300 to-blue-300" />
              <TreeNodeComponent node={node.left} position="left" onNodeClick={onNodeClick} />
            </div>
          )}

          {/* Empty Slot - Left */}
          {!node.left && node.right && (
            <div className="flex flex-col items-center min-w-[220px]">
              <div className="w-px h-8 bg-gray-200" />
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 min-w-[220px] flex flex-col items-center justify-center">
                <Users className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-400 font-medium">Available</p>
                <p className="text-xs text-gray-400">Left Position</p>
              </div>
            </div>
          )}

          {/* Right Child */}
          {node.right && (
            <div className="flex flex-col items-center">
              <div className="w-px h-8 bg-gradient-to-b from-gray-300 to-green-300" />
              <TreeNodeComponent node={node.right} position="right" onNodeClick={onNodeClick} />
            </div>
          )}

          {/* Empty Slot - Right */}
          {!node.right && node.left && (
            <div className="flex flex-col items-center min-w-[220px]">
              <div className="w-px h-8 bg-gray-200" />
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 min-w-[220px] flex flex-col items-center justify-center">
                <Users className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-400 font-medium">Available</p>
                <p className="text-xs text-gray-400">Right Position</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function MLMTree({ treeData }: MLMTreeProps) {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const handleNodeClick = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const closeModal = () => {
    setSelectedNode(null);
  };

  return (
    <div className="relative">
      {/* Tree Visualization */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 overflow-x-auto">
        <div className="inline-block min-w-full">
          <TreeNodeComponent node={treeData} onNodeClick={handleNodeClick} />
        </div>
      </div>

      {/* User Details Modal */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-24 h-24 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full shadow-lg">
                <span className="text-white text-4xl font-bold">{selectedNode.name.charAt(0).toUpperCase()}</span>
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-gray-600 mb-2">
                  <Users className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Name</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 ml-7">{selectedNode.name}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-gray-600 mb-2">
                  <Mail className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Email</span>
                </div>
                <p className="text-sm text-gray-900 ml-7 break-all">{selectedNode.email}</p>
              </div>

              {selectedNode.referralCode && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-600 mb-2">
                    <Hash className="w-5 h-5 mr-2" />
                    <span className="text-sm font-medium">Referral Code</span>
                  </div>
                  <p className="text-lg font-mono font-semibold text-purple-600 ml-7">{selectedNode.referralCode}</p>
                </div>
              )}

              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
                <div className="flex items-center text-yellow-700 mb-2">
                  <DollarSign className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Total Earnings</span>
                </div>
                <p className="text-2xl font-bold text-yellow-800 ml-7">₹{selectedNode.totalEarnings.toFixed(2)}</p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={closeModal}
              className="mt-6 w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
